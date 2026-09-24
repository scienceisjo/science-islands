(function() {
    'use strict';
    const T = THREE;
    /* 섬마다 바꿀 수 있는 색. 섬 파일이 IslandWorld.prototype.palette 로 일부만 덮어쓴다. 기본값 = 전기의 숲. */
    const DEFAULT_PALETTE = {
        sky: '#182c48',
        skyFestival: '#263d5d',
        fog: '#263e55',
        water: '#24465b',
        waterFestival: '#315c72',
        darkSky: '#304867',
        darkWater: '#345f78',
        hemiSky: 0x8ca9dd,
        hemiGround: 0x263747,
        sun: 0x7f9fee,
        playerShirt: '#5d9db0',
        playerSkin: '#513b30'
    };
    class IslandWorld {
        constructor(canvas, callbacks, state) {
            this.pal = Object.assign({}, DEFAULT_PALETTE, this.palette || {});
            this.regionCount = this.regionCount || 5;
            this.canvas = canvas;
            this.cb = callbacks;
            this.state = state;
            this.keys = new Set();
            this.path = [];
            this.colliders = [];
            this.trees = [];
            this.npcs = [];
            this.lamps = [];
            this.houseFades = [];
            this.flowers = [];
            this.time = 0;
            this.paused = true;
            this.pointer = {};
            this.joy = {
                x: 0,
                z: 0
            };
            this.dusk = state.festival ? 1 : 0;
            this.pendingNpc = null;
            this.camTarget = new T.Vector3();
            this.scene = new T.Scene();
            this.scene.background = new T.Color(this.pal.sky);
            this.scene.fog = new T.Fog(this.pal.fog, 42, 95);
            this.camera = new T.OrthographicCamera(-18, 18, 11, -11, 0.1, 130);
            this.renderer = new T.WebGLRenderer({
                canvas,
                antialias: true,
                alpha: false,
                powerPreference: 'high-performance'
            });
            this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = T.PCFSoftShadowMap;
            this.renderer.outputEncoding = T.sRGBEncoding;
            this.renderer.toneMapping = T.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = .78;
            this.hemi = new T.HemisphereLight(this.pal.hemiSky, this.pal.hemiGround, 0.24);
            this.scene.add(this.hemi);
            this.sun = new T.DirectionalLight(this.pal.sun, 0.14);
            this.sun.position.set(-13, 26, 14);
            this.sun.castShadow = true;
            this.sun.shadow.mapSize.set(1536, 1536);
            Object.assign(this.sun.shadow.camera, {
                left: -32,
                right: 32,
                top: 32,
                bottom: -32,
                near: 1,
                far: 80
            });
            this.sun.shadow.bias = -0.0007;
            this.sun.shadow.normalBias = 0.035;
            this.sun.shadow.radius = 3;
            this.scene.add(this.sun);
            this.materials = {};
            this.festivalLights = [];
            this.festivalRun = null;
            this.festivalSerial = 0;
            this.motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion:reduce)') : null;
            this.seed = 487;
            this.build();
            this.buildFestivalDecor();
            this.batchStatic();
            this.player = this.character(this.pal.playerShirt, this.pal.playerSkin, 'human');
            this.player.position.set(state.pos.x, 0.43, state.pos.z);
            this.scene.add(this.player);
            this.camTarget.copy(this.player.position);
            this.ray = new T.Raycaster();
            this.mouse = new T.Vector2();
            this.plane = new T.Plane(new T.Vector3(0, 1, 0), -0.43);
            this.resize();
            this.bind();
            this.applyProgress();
            this.last = performance.now();
            this.frame = this.frame.bind(this);
            requestAnimationFrame(this.frame);
        }
        rnd() {
            this.seed = (this.seed * 16807) % 2147483647;
            return (this.seed - 1) / 2147483646;
        }
        mat(color, rough = 0.9) {
            const key = color + '_' + rough;
            return this.materials[key] || (this.materials[key] = new T.MeshStandardMaterial({
                color: new T.Color(color).convertSRGBToLinear(),
                roughness: rough
            }));
        }
        regionAt(x, z) {
            let region = 0,
                distance = Infinity;
            for (const q of IslandModel.quests) {
                const d = Math.hypot(x - q.x, z - q.z);
                if (d < distance) {
                    distance = d;
                    region = q.id;
                }
            }
            return region;
        }
        registerFestivalLight(material, q, {
            off = '#506169',
            on = '#ffe3a0',
            power = 1.5,
            points = false
        } = {}) {
            // Only dedicated window/lantern materials enter this list. Cached scenery materials stay untouched.
            const light = {
                material,
                q,
                off: new T.Color(off).convertSRGBToLinear(),
                on: new T.Color(on).convertSRGBToLinear(),
                power,
                points,
                level: 0
            };
            if (material.emissive) material.emissive.copy(new T.Color('#ffc36a').convertSRGBToLinear());
            this.festivalLights.push(light);
            return light;
        }
        setFestivalLight(light, level) {
            level = Math.max(0, Math.min(1, level));
            light.level = level;
            light.material.color.copy(light.off).lerp(light.on, level);
            if (light.material.emissive) light.material.emissiveIntensity = light.power * level;
            if (light.points) light.material.opacity = level;
        }
        glow(radius, color, x, y, z, q, parent) {
            const material = new T.MeshStandardMaterial({
                color: new T.Color(color).convertSRGBToLinear(),
                emissive: 0xffbd68,
                emissiveIntensity: 0,
                roughness: .45
            });
            const m = this.ball(radius, material, x, y, z, parent);
            m.castShadow = false;
            this.registerFestivalLight(material, q, {
                on: color
            });
            this.lamps.push({
                m,
                q
            });
            return m;
        }
        mesh(geo, color, x = 0, y = 0, z = 0, parent = this.scene) {
            const m = new T.Mesh(geo, typeof color === 'string' || typeof color === 'number' ? this.mat(color) : color);
            m.position.set(x, y, z);
            m.castShadow = true;
            m.receiveShadow = true;
            parent.add(m);
            return m;
        }
        box(w, h, d, color, x, y, z, parent) {
            return this.mesh(new T.BoxGeometry(w, h, d), color, x, y, z, parent);
        }
        ball(r, color, x, y, z, parent, sx = 1, sy = 1, sz = 1) {
            const m = this.mesh(new T.SphereGeometry(r, 12, 9), color, x, y, z, parent);
            m.scale.set(sx, sy, sz);
            return m;
        }
        cylinder(r1, r2, h, color, x, y, z, parent, sides = 12) {
            return this.mesh(new T.CylinderGeometry(r1, r2, h, sides), color, x, y, z, parent);
        }
        texture() {
            const c = document.createElement('canvas');
            c.width = c.height = 256;
            const g = c.getContext('2d');
            g.fillStyle = '#8dcc73';
            g.fillRect(0, 0, 256, 256);
            for (let i = 0; i < 2300; i++) {
                const x = this.rnd() * 256,
                    y = this.rnd() * 256;
                g.fillStyle = i % 3 === 0 ? 'rgba(220,239,140,.16)' : 'rgba(35,115,52,.09)';
                g.beginPath();
                g.moveTo(x, y);
                g.lineTo(x + 3, y - 5);
                g.lineTo(x + 6, y);
                g.fill();
            }
            const tex = new T.CanvasTexture(c);
            tex.wrapS = tex.wrapT = T.RepeatWrapping;
            tex.repeat.set(5, 5);
            tex.encoding = T.sRGBEncoding;
            return tex;
        }
        terrain(x0, x1, z0, z1) {
            const s = new T.Shape(),
                r = 2;
            s.moveTo(x0 + r, z0);
            s.lineTo(x1 - r, z0);
            s.quadraticCurveTo(x1, z0, x1, z0 + r);
            s.lineTo(x1, z1 - r);
            s.quadraticCurveTo(x1, z1, x1 - r, z1);
            s.lineTo(x0 + r, z1);
            s.quadraticCurveTo(x0, z1, x0, z1 - r);
            s.lineTo(x0, z0 + r);
            s.quadraticCurveTo(x0, z0, x0 + r, z0);
            const g = new T.ExtrudeGeometry(s, {
                depth: 1.25,
                bevelEnabled: true,
                bevelSegments: 3,
                steps: 1,
                bevelSize: 0.28,
                bevelThickness: 0.22,
                curveSegments: 10
            });
            g.rotateX(-Math.PI / 2);
            this.mesh(g, '#d8ae72', 0, -1.05, 0);
            const gg = new T.ShapeGeometry(s, 18);
            gg.rotateX(-Math.PI / 2);
            const ground = this.mesh(gg, this.grass, 0, 0.44, 0);
            ground.castShadow = false;
        }
        pathLine(points, width = 2) {
            for (let i = 1; i < points.length; i++) {
                const a = points[i - 1],
                    b = points[i],
                    dx = b[0] - a[0],
                    dz = b[1] - a[1],
                    len = Math.hypot(dx, dz);
                const p = this.box(width, .055, len + .2, '#e5cc98', (a[0] + b[0]) / 2, .46, (a[1] + b[1]) / 2);
                p.rotation.y = Math.atan2(dx, dz);
                p.castShadow = false;
                for (let d = .45; d < len; d += .85) {
                    const f = d / len;
                    for (let j = -1; j <= 1; j++) {
                        const xx = a[0] + dx * f + (dz / len) * j * .62,
                            zz = a[1] + dz * f - (dx / len) * j * .62;
                        const stone = this.box(.52, .018, .55, j % 2 ? '#ecd7aa' : '#f0dcb2', xx, .5, zz);
                        stone.rotation.y = Math.atan2(dx, dz) + (this.rnd() - .5) * .15;
                        stone.castShadow = false;
                    }
                }
            }
            for (const p of points) {
                const m = this.cylinder(width * .52, width * .52, .04, '#e5cc98', p[0], .47, p[1], undefined, 20);
                m.castShadow = false;
            }
        }
        tree(x, z, size = 1, fruit = false) {
            const g = new T.Group();
            g.position.set(x, .45, z);
            g.scale.setScalar(size);
            this.scene.add(g);
            this.cylinder(.19, .31, 1.75, '#a57449', 0, .83, 0, g, 7);
            const colors = ['#68aa62', '#7bbd6e', '#90cb76'];
            const leaves = new T.Group();
            g.add(leaves);
            [
                [0, 2.5, 0, 1.32],
                [-.65, 2.05, .12, .96],
                [.6, 2.18, .18, 1.0],
                [.08, 2.07, -.65, .95],
                [.05, 3.08, .03, .87]
            ].forEach((a, i) => this.ball(a[3], colors[i % 3], a[0], a[1], a[2], leaves, 1, .86, 1));
            if (fruit)[[-.66, 2.12, .87], [.6, 2.49, .78], [.06, 3, .72]].forEach(p => this.ball(.19, '#ecad48', ...p, leaves));
            this.trees.push({
                g: leaves,
                offset: this.rnd() * 8
            });
            this.colliders.push({
                x,
                z,
                r: .65 * size
            });
        }
        fence(x, z, length, axis = 'x') {
            const g = new T.Group();
            g.position.set(x, .48, z);
            if (axis === 'z') g.rotation.y = Math.PI / 2;
            this.scene.add(g);
            for (let k = 0; k <= length; k += .82) {
                this.box(.14, .88, .14, '#d6aa73', k, .44, 0, g);
                this.cylinder(.13, .13, .14, '#e6bf88', k, .92, 0, g, 4);
            }
            this.box(length, .13, .1, '#d7ac79', length / 2, .35, 0, g);
            this.box(length, .13, .1, '#e9bf85', length / 2, .69, 0, g);
        }
        house(x, z, roofColor, wallColor, kind = 'house') {
            const g = new T.Group();
            g.position.set(x, .44, z);
            this.scene.add(g);
            const w = kind === 'cafe' ? 4.5 : 4,
                d = 3.3;
            this.box(w + .35, .22, d + .4, '#b0a591', 0, .12, 0, g);
            this.box(w, 2.8, d, wallColor, 0, 1.55, 0, g);
            const vs = new Float32Array([-w / 2 - .35, 2.85, -d / 2 - .4, w / 2 + .35, 2.85, -d / 2 - .4, 0, 4.2, -d / 2 - .4, -w / 2 - .35, 2.85, d / 2 + .4, w / 2 + .35, 2.85, d / 2 + .4, 0, 4.2, d / 2 + .4]);
            const roof = new T.BufferGeometry();
            roof.setAttribute('position', new T.BufferAttribute(vs, 3));
            roof.setIndex([0, 2, 1, 3, 4, 5, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4, 0, 1, 4, 0, 4, 3]);
            roof.computeVertexNormals();
            this.mesh(roof, roofColor, 0, 0, 0, g);
            for (let i = 0; i < 7; i++) {
                const xx = -w / 2 - .28 + i * (w + .56) / 6,
                    yy = 4.22 - Math.abs(xx) / (w / 2 + .35) * 1.34;
                this.box(.045, .045, d + .82, roofColor, xx, yy, 0, g);
            }
            const windowGlass = new T.MeshStandardMaterial({
                    color: 0x738c8b,
                    emissive: 0xffbf63,
                    emissiveIntensity: 0,
                    roughness: .4
                }),
                windows = [];
            this.box(.95, 1.85, .12, '#866743', -.2, 1.1, d / 2 + .07, g);
            windows.push(this.box(.59, .58, .14, windowGlass, -.2, 1.5, d / 2 + .15, g));
            this.ball(.055, '#f3d087', .12, 1, d / 2 + .18, g);
            for (const xx of [-1.3, 1.25]) {
                this.box(.85, .95, .14, '#f7ebca', xx, 1.67, d / 2 + .08, g);
                windows.push(this.box(.64, .72, .16, windowGlass, xx, 1.67, d / 2 + .1, g));
                this.box(.04, .76, .18, '#fff0c9', xx, 1.67, d / 2 + .13, g);
                this.box(.7, .04, .18, '#fff0c9', xx, 1.67, d / 2 + .13, g);
                this.box(1, .17, .42, '#a67e54', xx, 1.11, d / 2 + .19, g);
                for (let f = 0; f < 3; f++) this.flower(x + xx + (f - 1) * .24, z + d / 2 + .28, '#f5b2ab', 1.15);
            }
            this.box(.55, 1.1, .62, '#b09073', 1.25, 3.65, -.7, g);
            if (kind === 'cafe') {
                for (let k = 0; k < 7; k++) {
                    const a = this.box(.64, .09, 1.1, k % 2 ? '#fff0c9' : '#61a8a0', -1.92 + k * .64, 2.51, d / 2 + .54, g);
                    a.rotation.x = .14;
                }
                this.cylinder(.09, .09, 2.4, '#f1dfb2', -2, 1.2, d / 2 + 1, g);
                this.cylinder(.09, .09, 2.4, '#f1dfb2', 2, 1.2, d / 2 + 1, g);
            }
            const fadeMaterials = new Map();
            g.traverse(m => {
                if (m.isMesh) {
                    if (!fadeMaterials.has(m.material.uuid)) {
                        const material = m.material.clone();
                        material.transparent = true;
                        fadeMaterials.set(m.material.uuid, material);
                    }
                    m.material = fadeMaterials.get(m.material.uuid);
                }
            });
            for (const material of new Set(windows.map(m => m.material))) this.registerFestivalLight(material, this.regionAt(x, z), {
                off: '#627c80',
                on: '#ffe3a4',
                power: 1.8
            });
            windowGlass.dispose();
            this.houseFades.push({
                box: new T.Box3(new T.Vector3(x - w / 2 - .4, .45, z - d / 2 - .4), new T.Vector3(x + w / 2 + .4, 4.8, z + d / 2 + .4)),
                materials: [...fadeMaterials.values()]
            });
            this.colliders.push({
                x,
                z,
                w: w / 2 + .2,
                d: d / 2 + .1
            });
            return g;
        }
        flower(x, z, color, y = .46) {
            const g = new T.Group();
            g.position.set(x, y, z);
            this.scene.add(g);
            this.cylinder(.026, .028, .27, '#508e44', 0, .14, 0, g, 5);
            for (let j = 0; j < 5; j++) {
                const a = j * Math.PI * 2 / 5;
                this.ball(.085, color, Math.cos(a) * .092, .3, Math.sin(a) * .092, g, 1, .6, 1);
            }
            this.ball(.048, '#f1d470', 0, .33, 0, g);
        }
        lamp(x, z, q) {
            this.cylinder(.06, .09, 1.65, '#6c7968', x, 1.25, z);
            this.cylinder(.3, .22, .15, '#e1bd7d', x, 2.13, z);
            this.glow(.22, '#ffe6a0', x, 1.91, z, q);
        }
        character(shirt, skin, kind) {
            const g = new T.Group();
            this.cylinder(.3, .4, .7, shirt, 0, .73, 0, g);
            this.ball(.44, skin, 0, 1.38, .02, g, 1, 1.08, .95);
            if (kind === 'human') {
                this.ball(.445, '#533d32', 0, 1.56, -.075, g, 1, .72, 1);
                this.box(.63, .15, .22, '#533d32', 0, 1.69, .29, g);
                this.ball(.1, skin, -.43, 1.4, 0, g);
                this.ball(.1, skin, .43, 1.4, 0, g);
                this.box(.37, .45, .19, '#d5ba7f', 0, .83, -.31, g);
            } else {
                const earY = kind === 'rabbit' ? 2.02 : 1.77,
                    earR = kind === 'rabbit' ? .15 : .2;
                this.ball(earR, skin, -.27, earY, 0, g, 1, kind === 'rabbit' ? 2.5 : 1, 1);
                this.ball(earR, skin, .27, earY, 0, g, 1, kind === 'rabbit' ? 2.5 : 1, 1);
                this.ball(.24, '#f2dfb9', 0, 1.23, .31, g, 1, .72, .65);
                this.ball(.07, '#644e40', 0, 1.37, .44, g);
            }
            for (const x of [-.16, .16]) {
                this.ball(.041, '#32392f', x, 1.43, .402, g, .85, 1.22, .7);
                this.ball(.013, '#fff8e9', x - .012, 1.448, .426, g);
                this.ball(.08, '#e9b0a0', x * 1.65, 1.3, .35, g, 1, .45, .3);
            }
            const legs = [];
            for (const x of [-.16, .16]) {
                const leg = new T.Group();
                leg.position.set(x, .42, 0);
                g.add(leg);
                this.cylinder(.105, .105, .31, '#566675', 0, -.12, 0, leg, 8);
                this.ball(.14, '#faf0d4', 0, -.26, .06, leg, 1, .6, 1.25);
                legs.push(leg);
                this.ball(.115, skin, x * 2.4, .69, .02, g, .85, 1.5, 1);
            }
            g.userData.legs = legs;
            return g;
        }
        build() {
            this.grass = new T.MeshStandardMaterial({
                map: this.texture(),
                color: new T.Color('#f8fff1').convertSRGBToLinear(),
                roughness: 1
            });
            this.waterMat = new T.MeshStandardMaterial({
                color: new T.Color('#24465b').convertSRGBToLinear(),
                roughness: .3,
                metalness: .06,
                transparent: true,
                opacity: .98
            });
            const wg = new T.PlaneGeometry(160, 160, 35, 35);
            wg.rotateX(-Math.PI / 2);
            this.water = this.mesh(wg, this.waterMat, 0, -.5, 0);
            this.water.castShadow = false;
            this.water.receiveShadow = false;
            this.terrain(-21, 6, -18, 18);
            this.terrain(9, 22, -18, 18);
            this.pathLine([
                [-16, 14],
                [-12, 11],
                [-8, 8],
                [-3, 5],
                [3, 3],
                [13, 3]
            ], 2.2);
            this.pathLine([
                [-3, 5],
                [-5, 0],
                [-9, -2],
                [-10, -4]
            ], 2);
            this.pathLine([
                [-5, 0],
                [-2, -4],
                [0, -9],
                [4, -9],
                [13, -9]
            ], 1.85);
            this.pathLine([
                [13, 3],
                [16, 0],
                [16, -5],
                [13, -7]
            ], 1.7);
            this.pathLine([
                [-3, 5],
                [-1, 10],
                [-1, 13]
            ], 1.55);
            for (const z of [3, -9]) {
                for (let x = 5.8; x <= 9.2; x += .27) this.box(.23, .22, 2.7, '#c29a68', x, .57, z);
                for (const zz of [z - 1.4, z + 1.4]) {
                    this.box(3.8, .12, .12, '#eed5a0', 7.5, 1.35, zz);
                    for (const x of [5.75, 6.9, 8.1, 9.25]) this.box(.14, 1.1, .14, '#b88954', x, .93, zz);
                }
            }
            this.house(-10, -6, '#b75f50', '#f0deb3');
            this.house(-11, 6, '#687f9d', '#e7d8b6');
            this.house(15, 0, '#629b90', '#f6e9ca', 'cafe');
            this.box(2.1, .2, .8, '#a57851', -8, 1.0, 6);
            for (const x of [-8.8, -7.2]) this.box(.12, .7, .6, '#745a42', x, .65, 6);
            this.cylinder(.35, .35, .3, '#b17749', -8, 1.3, 6);
            this.box(.7, .25, .5, '#87989a', -7.5, 1.25, 6);
            for (const x of [-2, 1]) this.lamp(x, -10, 2);
            this.box(3, .4, 1.8, '#947358', 15, .65, -13);
            this.house(18, -10, '#beaa77', '#d8c6a7', 'booth');
            const plaza = this.cylinder(3.4, 3.4, .1, '#e5c291', 13, .49, -11, undefined, 40);
            plaza.castShadow = false;
            for (let i = 0; i < 18; i++) {
                const a = i * Math.PI * 2 / 18;
                this.box(.55, .018, .6, i % 2 ? '#eacda7' : '#d6b181', 13 + Math.cos(a) * 2.8, .555, -11 + Math.sin(a) * 2.8).rotation.y = -a;
            }
            this.cylinder(.4, .7, .48, '#e5d8b3', 13, .76, -11);
            this.cylinder(.09, .12, 3.4, '#a87d50', 13, 2.65, -11);
            this.glow(.43, '#ffe6a1', 13, 4.45, -11, 4);
            for (let j = 0; j < 9; j++) {
                const x = 10 + j * .75,
                    z = -11.7;
                this.cylinder(.04, .04, 2.8, '#b89163', x, 1.9, z);
                this.glow(.15, j % 2 ? '#ffdc9c' : '#acf0df', x, 3.2, z, 4);
            }
            this.fence(-15, -3, 3);
            this.fence(-15, -9, 6, 'z');
            this.fence(-15, 9, 4);
            this.fence(-5, -11, 3, 'z');
            this.fence(17, 6, 3);
            this.fence(19, -7, 5, 'z');
            // A compact vegetable patch and a player campsite are part of the explorable world.
            this.box(3, .08, 2.8, '#a9815c', -15, .49, 4);
            for (let i = 0; i < 4; i++)
                for (let j = 0; j < 3; j++) {
                    this.ball(.2, '#83b25a', -16 + i * .65, .7, 3.2 + j * .73);
                    if (j % 2 === 0) this.ball(.11, '#dd8764', -16 + i * .65, .66, 3.4 + j * .73);
                }
            const tent = new T.ConeGeometry(1.85, 2.15, 4);
            tent.rotateY(Math.PI / 4);
            this.mesh(tent, '#e8c983', -1, 1.5, 13);
            this.box(.83, 1.1, .08, '#85765c', -1, 1.05, 14.05);
            this.ball(.32, '#b1c6aa', 1, .72, 13.5);
            this.lamp(.7, 11.7, 0);
            this.campDecor = new T.Group();
            this.campDecor.position.set(-2, .5, 11);
            this.scene.add(this.campDecor);
            for (let i = 0; i < 65; i++) {
                const edge = i < 38;
                let x, z;
                if (edge) {
                    x = -19 + this.rnd() * 38;
                    z = (this.rnd() > .5 ? 1 : -1) * (13.5 + this.rnd() * 2.5);
                } else {
                    x = -19 + this.rnd() * 39;
                    z = -14 + this.rnd() * 27;
                }
                if (x > 4 && x < 10) continue;
                if (this.nearPath(x, z) || this.colliders.some(c => Math.abs(x - c.x) < (c.w || 2) + 1.5 && Math.abs(z - c.z) < (c.d || 2) + 1.5) || Math.hypot(x - 13, z + 11) < 4 || Math.hypot(x + 1, z - 13) < 2.5) continue;
                this.tree(x, z, .75 + this.rnd() * .4, i % 4 === 0);
            }
            for (const [x, z] of [
                    [1.6, 7.6],
                    [1, -1],
                    [-5.6, -6.9],
                    [11.3, -2.2],
                    [18.8, 8.5],
                    [-5.5, 10.5]
                ]) this.tree(x, z, 1.03, true);
            for (let i = 0; i < 340; i++) {
                const x = -19 + this.rnd() * 39,
                    z = -15 + this.rnd() * 30;
                if (x > 5 && x < 10 || this.nearPath(x, z, .8)) continue;
                this.flower(x, z, ['#fff1a8', '#f2a8bd', '#f8f9e6', '#b3abe9', '#8dcced'][i % 5]);
            }
            for (const [cx, cz] of [
                    [-5, 8],
                    [-12, -2],
                    [2, -7],
                    [11, 5],
                    [17, -7],
                    [-3, 12]
                ])
                for (let j = 0; j < 11; j++) {
                    const a = j * 2.4,
                        r = .35 + Math.sqrt(j) * .22;
                    this.flower(cx + Math.cos(a) * r, cz + Math.sin(a) * r, ['#fff0a0', '#f2a6be', '#adabe9', '#fff8ef'][j % 4]);
                }
            for (const [x, z] of [
                    [-5, 3],
                    [17, 4.3]
                ]) {
                this.box(1.7, .15, .57, '#bf915b', x, .9, z);
                for (const dx of [-.6, .6]) this.box(.12, .65, .45, '#90734e', x + dx, .62, z);
                this.box(1.7, .42, .12, '#d4a470', x, 1.25, z - .22);
                this.colliders.push({
                    x,
                    z,
                    w: .9,
                    d: .4
                });
            }
            for (const [x, z] of [
                    [13.6, 5.2],
                    [17.8, 3.8]
                ]) {
                this.cylinder(.65, .65, .13, '#efcf8e', x, 1.05, z);
                this.cylinder(.12, .21, .55, '#ac8f64', x, .74, z);
                this.cylinder(.09, .07, .14, '#f4e5bf', x + .16, 1.2, z);
                this.ball(.14, '#a6be80', x - .18, 1.22, z);
            }
            for (const [x, z] of [
                    [-6, 6],
                    [-11, -2],
                    [-3, -5],
                    [1, -9],
                    [10, 4],
                    [17, 4],
                    [11, -7],
                    [16, -10]
                ]) this.lamp(x, z, this.regionAt(x, z));
            for (let i = 0; i < 10; i++) {
                const g = this.ball(.23, '#cad3ad', -18 + i * 1.1, .57, 15.7, undefined, 1.5, .5, 1);
                g.rotation.y = this.rnd() * 3;
            }
            IslandModel.quests.forEach((q, i) => {
                const g = this.character(['#e1a668', '#7fadb1', '#a58fac', '#93b69a', '#ce9c7b'][i], ['#c5c7be', '#d69867', '#ae8a64', '#e3d2bd', '#e6c770'][i], i === 3 ? 'rabbit' : 'animal');
                g.position.set(q.x, .45, q.z);
                g.rotation.y = .2;
                this.scene.add(g);
                const ring = this.mesh(new T.TorusGeometry(.71, .055, 8, 28), '#fff0ad', 0, .02, 0, g);
                ring.rotation.x = Math.PI / 2;
                const marker = this.ball(.18, '#ffdf85', 0, 2.45, 0, g);
                this.npcs.push({
                    q,
                    g,
                    marker,
                    ring
                });
            });
            this.clouds = [];
            for (let i = 0; i < 7; i++) {
                const group = new T.Group();
                group.position.set(-36 + i * 12, 12 + this.rnd() * 5, -29 - this.rnd() * 8);
                this.scene.add(group);
                for (let j = 0; j < 4; j++) this.ball(1.3, '#f2f4df', j * 1.25, Math.sin(j) * .3, 0, group, 1.5, .5, .75);
                this.clouds.push(group);
            }
        }
        buildFestivalDecor() {
            // Five point batches add tree garlands without dozens of lamps, shadows or draw calls.
            const positions = Array.from({
                length: this.regionCount
            }, () => []);
            this.scene.updateMatrixWorld(true);
            for (const tree of this.trees) {
                const trunk = tree.g.parent,
                    q = this.regionAt(trunk.position.x, trunk.position.z);
                for (let k = 0; k < 7; k++) {
                    const a = k * Math.PI * 2 / 7,
                        p = new T.Vector3(Math.cos(a) * 1.04, 2.2 + Math.sin(a * 2) * .13, Math.sin(a) * 1.04);
                    trunk.localToWorld(p);
                    positions[q].push(p.x, p.y, p.z);
                }
            }
            for (let q = 0; q < this.regionCount; q++) {
                if (!positions[q].length) continue;
                const geometry = new T.BufferGeometry();
                geometry.setAttribute('position', new T.Float32BufferAttribute(positions[q], 3));
                const material = new T.PointsMaterial({
                    color: 0xffdf9b,
                    size: 3.5,
                    sizeAttenuation: false,
                    transparent: true,
                    opacity: 0,
                    depthWrite: false
                });
                this.scene.add(new T.Points(geometry, material));
                this.registerFestivalLight(material, q, {
                    on: q % 2 ? '#bdf3d5' : '#ffe1a1',
                    points: true
                });
            }
        }
        nearPath(x, z, pad = 1.6) {
            return Math.abs(z - 3) < pad && x > -5 || Math.hypot(x + 3, z - 5) < 4 || Math.abs(x + 9) < pad && z > -5 && z < 10 || Math.abs(z + 9) < pad && x > -4 || Math.abs(x - 15) < pad && z > -7 && z < 6 || Math.hypot(x, z + 9) < 2.5;
        }
        blocked(x, z) {
            if (x < -19.5 || x > 20.5 || z < -16.4 || z > 16.4) return true;
            if (x > 5.45 && x < 9.55 && Math.abs(z - 3) > 1.13 && Math.abs(z + 9) > 1.13) return true;
            return this.colliders.some(c => c.r ? Math.hypot(x - c.x, z - c.z) < c.r + .28 : Math.abs(x - c.x) < c.w + .28 && Math.abs(z - c.z) < c.d + .28);
        }
        findPath(tx, tz) {
            const size = .75,
                from = [Math.round(this.player.position.x / size), Math.round(this.player.position.z / size)],
                to = [Math.round(tx / size), Math.round(tz / size)];
            const key = p => p.join(',');
            if (this.blocked(to[0] * size, to[1] * size)) return [];
            let open = [{
                    p: from,
                    g: 0,
                    f: 0
                }],
                seen = new Map([
                    [key(from), {
                        g: 0,
                        parent: null
                    }]
                ]),
                end = null;
            for (let n = 0; open.length && n < 5000; n++) {
                open.sort((a, b) => a.f - b.f);
                const cur = open.shift();
                if (cur.p[0] === to[0] && cur.p[1] === to[1]) {
                    end = key(cur.p);
                    break;
                }
                for (const d of [
                        [1, 0],
                        [-1, 0],
                        [0, 1],
                        [0, -1],
                        [1, 1],
                        [1, -1],
                        [-1, 1],
                        [-1, -1]
                    ]) {
                    const p = [cur.p[0] + d[0], cur.p[1] + d[1]],
                        k = key(p);
                    if (this.blocked(p[0] * size, p[1] * size)) continue;
                    if (d[0] && d[1] && (this.blocked(p[0] * size, cur.p[1] * size) || this.blocked(cur.p[0] * size, p[1] * size))) continue;
                    const g = cur.g + Math.hypot(...d);
                    if (seen.has(k) && seen.get(k).g <= g) continue;
                    seen.set(k, {
                        g,
                        parent: key(cur.p)
                    });
                    open.push({
                        p,
                        g,
                        f: g + Math.hypot(p[0] - to[0], p[1] - to[1])
                    });
                }
            }
            if (!end) return [];
            const path = [];
            while (end && end !== key(from)) {
                const p = end.split(',').map(Number);
                path.push({
                    x: p[0] * size,
                    z: p[1] * size
                });
                end = seen.get(end).parent;
            }
            return path.reverse();
        }
        go(q) {
            this.path = this.findPath(q.x, q.z + 1.6);
            if (!this.path.length) {
                this.cb.toast('가까운 길을 눌러 이동해 보세요.');
                return;
            }
            this.pendingNpc = q.id;
        }
        bind() {
            window.addEventListener('resize', () => this.resize());
            window.addEventListener('keydown', e => {
                if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable) return;
                if (this.paused || this.festivalRun) return;
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
                this.keys.add(e.code);
                if (e.code === 'KeyE' || e.code === 'Space') {
                    if (this.nearest != null) this.cb.interact(this.nearest);
                }
                if (e.code === 'KeyJ') this.cb.journal();
            });
            window.addEventListener('keyup', e => this.keys.delete(e.code));
            window.addEventListener('blur', () => {
                this.keys.clear();
                this.joy = {
                    x: 0,
                    z: 0
                };
            });
            document.addEventListener('visibilitychange', () => {
                if (document.hidden && this.festivalRun) this.finishFestival('hidden');
            });
            const reducedChanged = e => {
                if (e.matches && this.festivalRun) this.finishFestival('reduced-motion');
            };
            if (this.motionQuery?.addEventListener) this.motionQuery.addEventListener('change', reducedChanged);
            else this.motionQuery?.addListener?.(reducedChanged);
            this.canvas.addEventListener('pointerdown', e => {
                this.pointer = {
                    x: e.clientX,
                    y: e.clientY,
                    t: performance.now()
                };
            });
            this.canvas.addEventListener('pointerup', e => {
                if (this.paused || this.festivalRun || Math.hypot(e.clientX - this.pointer.x, e.clientY - this.pointer.y) > 15) return;
                const rect = this.canvas.getBoundingClientRect();
                this.mouse.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
                this.ray.setFromCamera(this.mouse, this.camera);
                const hit = new T.Vector3();
                if (this.ray.ray.intersectPlane(this.plane, hit)) {
                    const npc = this.npcs.find(n => Math.hypot(n.q.x - hit.x, n.q.z - hit.z) < 1.25);
                    if (npc) {
                        if (Math.hypot(npc.q.x - this.player.position.x, npc.q.z - this.player.position.z) < 3) this.cb.interact(npc.q.id);
                        else this.go(npc.q);
                    } else {
                        this.path = this.findPath(hit.x, hit.z);
                        this.pendingNpc = null;
                    }
                }
            });
        }
        batchStatic() {
            this.scene.updateMatrixWorld(true);
            const keep = new Set([this.water, this.campDecor, ...this.trees.map(t => t.g), ...this.npcs.map(n => n.g), ...this.lamps.map(l => l.m), ...this.clouds]);
            const groups = new Map();
            this.scene.traverse(m => {
                if (!m.isMesh || Array.isArray(m.material)) return;
                for (let p = m; p; p = p.parent)
                    if (keep.has(p)) return;
                const key = m.material.uuid + '_' + m.castShadow + '_' + m.receiveShadow;
                if (!groups.has(key)) groups.set(key, {
                    mat: m.material,
                    cast: m.castShadow,
                    receive: m.receiveShadow,
                    meshes: []
                });
                groups.get(key).meshes.push(m);
            });
            for (const {
                    mat,
                    cast,
                    receive,
                    meshes
                }
                of groups.values()) {
                if (meshes.length < 2) continue;
                let pos = [],
                    normal = [],
                    uv = [];
                for (const m of meshes) {
                    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
                    g.applyMatrix4(m.matrixWorld);
                    const p = g.attributes.position,
                        n = g.attributes.normal,
                        u = g.attributes.uv;
                    pos.push(...p.array);
                    normal.push(...(n ? n.array : new Float32Array(p.count * 3)));
                    uv.push(...(u ? u.array : new Float32Array(p.count * 2)));
                    g.dispose();
                    m.parent.remove(m);
                }
                const merged = new T.BufferGeometry();
                merged.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
                merged.setAttribute('normal', new T.Float32BufferAttribute(normal, 3));
                merged.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
                const mesh = new T.Mesh(merged, mat);
                mesh.castShadow = cast;
                mesh.receiveShadow = receive;
                this.scene.add(mesh);
            }
        }
        resize() {
            const w = this.canvas.clientWidth,
                h = this.canvas.clientHeight;
            this.renderer.setSize(w, h, false);
            const hh = w < 650 ? 10 : 9;
            this.camera.left = -hh * w / h;
            this.camera.right = hh * w / h;
            this.camera.top = hh;
            this.camera.bottom = -hh;
            this.camera.updateProjectionMatrix();
        }
        applyProgress() {
            const done = this.state.completed;
            if (!this.festivalRun) this.restoreFestivalLights();
            for (const n of this.npcs) {
                n.marker.material = this.mat(done.includes(n.q.id) ? '#a7d6b1' : '#ffdc80');
            }
            while (this.campDecor.children.length) this.campDecor.remove(this.campDecor.children[0]);
            if (done.includes(1)) {
                this.cylinder(.3, .24, .46, '#c89272', 0, .23, 0, this.campDecor);
                this.ball(.4, '#77a45c', 0, .65, 0, this.campDecor);
                this.ball(.14, '#f5bd94', .12, .92, .15, this.campDecor);
            }
            if (done.includes(2)) {
                this.cylinder(.03, .03, 1.9, '#a88964', 1, .95, 0, this.campDecor);
                this.box(.65, .45, .035, '#f2cc75', 1.32, 1.6, 0, this.campDecor);
            }
            if (done.includes(4)) {
                this.box(.5, .13, .5, '#a57751', .6, .065, .6, this.campDecor);
                this.cylinder(.13, .13, .35, '#d3a477', .6, .28, .6, this.campDecor);
            }
            if (done.includes(3)) this.ball(.27, {
                mint: '#8bd6c6',
                peach: '#efb08e',
                lemon: '#ebd385'
            } [this.state.camp], -.8, .27, .2, this.campDecor);
        }
        restoreFestivalLights() {
            for (const light of this.festivalLights) this.setFestivalLight(light, this.state.festival || this.state.completed.includes(light.q) ? 1 : 0);
        }
        festivalCallback(callback, detail) {
            if (typeof callback === 'function') try {
                callback(detail);
            } catch (error) {
                console.error('축제 화면 연결 오류:', error);
            }
        }
        playFestival({
            onComplete,
            onStage,
            calm = this.state.calm
        } = {}) {
            this.cancelFestival();
            const reduced = !!calm || !!this.motionQuery?.matches;
            const run = {
                id: ++this.festivalSerial,
                started: performance.now(),
                duration: reduced ? 1.5 : 7.2,
                calm: reduced,
                onComplete,
                onStage,
                lastStage: '',
                lastRegion: -1,
                paused: this.paused,
                cameraTarget: this.camTarget.clone(),
                cameraZoom: this.camera.zoom,
                overview: new T.Vector3(1.5, .45, .8),
                cameraBlend: 0,
                initialLevels: this.festivalLights.map(l => l.level),
                sun: this.sun.intensity,
                hemi: this.hemi.intensity,
                sky: this.scene.background.clone(),
                water: this.waterMat.color.clone(),
                darkSky: new T.Color(this.pal.darkSky),
                darkWater: new T.Color(this.pal.darkWater).convertSRGBToLinear(),
                finalSky: new T.Color(this.state.festival ? this.pal.skyFestival : this.pal.sky),
                finalWater: new T.Color(this.state.festival ? this.pal.waterFestival : this.pal.water).convertSRGBToLinear()
            };
            this.festivalRun = run;
            this.keys.clear();
            this.joy = {
                x: 0,
                z: 0
            };
            this.path = [];
            this.pendingNpc = null;
            // The timeout only completes a suspended/very slow render loop; animation timing uses wall-clock time.
            run.timer = setTimeout(() => {
                if (this.festivalRun === run) this.finishFestival('complete');
            }, run.duration * 1000 + 120);
            this.updateFestival(run.started);
            if (document.hidden && this.festivalRun === run) this.finishFestival('hidden');
            return {
                durationMs: run.duration * 1000,
                cancel: () => {
                    if (this.festivalRun === run) this.cancelFestival();
                }
            };
        }
        cancelFestival({
            restore = true
        } = {}) {
            const run = this.festivalRun;
            if (!run) return false;
            clearTimeout(run.timer);
            this.festivalRun = null;
            this.keys.clear();
            this.joy = {
                x: 0,
                z: 0
            };
            if (restore) this.restoreFestivalView(run);
            return true;
        }
        restoreFestivalView(run) {
            this.camTarget.copy(run.cameraTarget);
            this.camera.zoom = run.cameraZoom;
            this.camera.updateProjectionMatrix();
            this.camera.position.set(this.camTarget.x + 13, this.camTarget.y + 21, this.camTarget.z + 19.5);
            this.camera.lookAt(this.camTarget.x, this.camTarget.y + .1, this.camTarget.z - 1);
            this.paused = run.paused;
            this.restoreFestivalLights();
            this.dusk = this.state.festival ? 1 : 0;
            this.sun.intensity = .14 + this.dusk * .08;
            this.hemi.intensity = .24 + this.dusk * .06;
            this.scene.background.set(this.state.festival ? this.pal.skyFestival : this.pal.sky);
            this.waterMat.color.copy(run.finalWater);
        }
        finishFestival(reason = 'complete') {
            const run = this.festivalRun;
            if (!run) return;
            const detail = {
                stage: 'complete',
                elapsed: run.duration,
                reason,
                calm: run.calm
            };
            this.cancelFestival();
            this.festivalCallback(run.onStage, detail);
            this.festivalCallback(run.onComplete, detail);
        }
        updateFestival(now) {
            const run = this.festivalRun;
            if (!run) return;
            const elapsed = Math.max(0, (now - run.started) / 1000);
            if (elapsed >= run.duration) {
                this.finishFestival('complete');
                return;
            }
            const smooth = x => {
                    x = Math.max(0, Math.min(1, x));
                    return x * x * (3 - 2 * x);
                },
                dimEnd = run.calm ? .35 : 1.2,
                step = run.calm ? .14 : .6,
                ramp = run.calm ? .2 : .45,
                finaleAt = run.calm ? 1.1 : 4.2,
                region = Math.min(this.regionCount - 1, Math.floor((elapsed - dimEnd) / step)),
                stage = elapsed < dimEnd ? 'dim' : elapsed < finaleAt ? 'relight' : 'finale';
            if (stage !== run.lastStage || stage === 'relight' && region !== run.lastRegion) {
                run.lastStage = stage;
                run.lastRegion = region;
                this.festivalCallback(run.onStage, {
                    stage,
                    region: stage === 'relight' ? region : undefined,
                    elapsed,
                    calm: run.calm
                });
                if (this.festivalRun !== run) return;
            }
            const floor = run.calm ? .5 : 0;
            for (let i = 0; i < this.festivalLights.length; i++) {
                const light = this.festivalLights[i],
                    level = elapsed < dimEnd ? run.initialLevels[i] * (1 - (1 - floor) * smooth(elapsed / (run.calm ? .35 : .7))) : floor + (1 - floor) * smooth((elapsed - dimEnd - light.q * step) / ramp);
                this.setFestivalLight(light, level);
            }
            const dim = smooth(elapsed / (run.calm ? .35 : 1.0)) * (run.calm ? .25 : 1),
                bright = smooth((elapsed - finaleAt) / (run.duration - finaleAt)),
                stableDusk = this.state.festival ? 1 : 0;
            this.sun.intensity = (run.sun + (0.32 - run.sun) * dim) * (1 - bright) + (.14 + stableDusk * .08) * bright;
            this.hemi.intensity = (run.hemi + (.63 - run.hemi) * dim) * (1 - bright) + (.24 + stableDusk * .06) * bright;
            this.scene.background.copy(run.sky).lerp(run.darkSky, dim).lerp(run.finalSky, bright);
            this.waterMat.color.copy(run.water).lerp(run.darkWater, dim).lerp(run.finalWater, bright);
            run.cameraBlend = run.calm ? 0 : smooth(elapsed / 1.25) * (1 - smooth((elapsed - 6.1) / 1.1));
        }
        frame(now) {
            requestAnimationFrame(this.frame);
            const dt = Math.min((now - this.last) / 1000, .04);
            this.last = now;
            this.time += dt;
            this.updateFestival(now);
            let dx = 0,
                dz = 0;
            if (!this.paused && !this.festivalRun) {
                let sx = 0,
                    sy = 0;
                if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) sy--;
                if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) sy++;
                if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) sx--;
                if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) sx++;
                sx += this.joy.x;
                sy += this.joy.z;
                if (Math.hypot(sx, sy) > .08) {
                    this.path = [];
                    this.pendingNpc = null;
                    dx = sx * .832 + sy * .555;
                    dz = -sx * .555 + sy * .832;
                } else if (this.path.length) {
                    const p = this.path[0],
                        dist = Math.hypot(p.x - this.player.position.x, p.z - this.player.position.z);
                    if (dist < .2) this.path.shift();
                    else {
                        dx = (p.x - this.player.position.x) / dist;
                        dz = (p.z - this.player.position.z) / dist;
                    }
                }
                const len = Math.hypot(dx, dz);
                if (len > .01) {
                    dx /= Math.max(1, len);
                    dz /= Math.max(1, len);
                    const nx = this.player.position.x + dx * 4.7 * dt,
                        nz = this.player.position.z + dz * 4.7 * dt;
                    if (!this.blocked(nx, this.player.position.z)) this.player.position.x = nx;
                    if (!this.blocked(this.player.position.x, nz)) this.player.position.z = nz;
                    const target = Math.atan2(dx, dz);
                    this.player.rotation.y += Math.atan2(Math.sin(target - this.player.rotation.y), Math.cos(target - this.player.rotation.y)) * Math.min(1, dt * 15);
                    this.player.position.y = .45 + (this.state.calm ? 0 : Math.abs(Math.sin(this.time * 12)) * .055);
                } else this.player.position.y = .45;
                this.player.userData.legs.forEach((leg, i) => leg.rotation.x = len > .01 && !this.state.calm ? Math.sin(this.time * 12 + i * Math.PI) * .45 : 0);
                let nearest = null,
                    distance = 3;
                for (const n of this.npcs) {
                    const d = Math.hypot(n.q.x - this.player.position.x, n.q.z - this.player.position.z);
                    if (d < distance) {
                        distance = d;
                        nearest = n.q.id;
                    }
                }
                if (nearest !== this.nearest) {
                    this.nearest = nearest;
                    this.cb.near(nearest);
                }
                if (this.pendingNpc != null && !this.path.length && nearest === this.pendingNpc) {
                    const id = this.pendingNpc;
                    this.pendingNpc = null;
                    this.cb.interact(id);
                }
            }
            if (this.festivalRun) {
                const run = this.festivalRun;
                this.camTarget.copy(run.cameraTarget).lerp(run.overview, run.cameraBlend);
                this.camera.zoom = run.cameraZoom * (1 - .46 * run.cameraBlend);
                this.camera.updateProjectionMatrix();
            } else this.camTarget.lerp(this.player.position, 1 - Math.exp(-dt * 3));
            this.camera.position.set(this.camTarget.x + 13, this.camTarget.y + 21, this.camTarget.z + 19.5);
            this.camera.lookAt(this.camTarget.x, this.camTarget.y + .1, this.camTarget.z - 1);
            if (!this.state.calm) {
                for (const t of this.trees) t.g.rotation.z = Math.sin(this.time * .8 + t.offset) * .016;
                for (const n of this.npcs) {
                    n.marker.position.y = 2.5 + Math.sin(this.time * 2 + n.q.id) * .08;
                    n.g.userData.legs[0].rotation.x = Math.sin(this.time + n.q.id) * .04;
                }
                for (const c of this.clouds) {
                    c.position.x += dt * .16;
                    if (c.position.x > 60) c.position.x = -55;
                }
                const a = this.water.geometry.attributes.position;
                for (let i = 0; i < a.count; i++) a.setY(i, Math.sin(a.getX(i) * .6 + this.time * .55) * Math.cos(a.getZ(i) * .4 + this.time * .3) * .035);
                a.needsUpdate = true;
            }
            const eye = this.player.position.clone().add(new T.Vector3(0, 1, 0)),
                sight = new T.Ray(this.camera.position, eye.clone().sub(this.camera.position).normalize()),
                hit = new T.Vector3();
            for (const house of this.houseFades) {
                const blocked = !this.festivalRun && sight.intersectBox(house.box, hit) && hit.distanceTo(this.camera.position) < eye.distanceTo(this.camera.position) - .5;
                for (const mat of house.materials) {
                    mat.opacity += ((blocked ? .25 : 1) - mat.opacity) * Math.min(1, dt * 8);
                    mat.depthWrite = mat.opacity > .95;
                }
            }
            if (!this.festivalRun) {
                this.dusk += (Number(this.state.festival) - this.dusk) * dt * .35;
                this.sun.intensity = .14 + this.dusk * .08;
                this.hemi.intensity = .24 + this.dusk * .06;
                this.scene.background.lerp(new T.Color(this.state.festival ? this.pal.skyFestival : this.pal.sky), dt * .3);
                this.waterMat.color.lerp(new T.Color(this.state.festival ? this.pal.waterFestival : this.pal.water).convertSRGBToLinear(), dt * .3);
            }
            this.renderer.render(this.scene, this.camera);
            if (Math.floor(this.time * 8) !== this.lastUi) {
                this.lastUi = Math.floor(this.time * 8);
                this.cb.update(this.player.position, this.npcs.map(n => {
                    const v = new T.Vector3(n.q.x, 3.4, n.q.z);
                    v.project(this.camera);
                    return {
                        id: n.q.id,
                        x: (v.x * .5 + .5) * this.canvas.clientWidth,
                        y: (-.5 * v.y + .5) * this.canvas.clientHeight,
                        visible: v.z < 1
                    };
                }));
            }
        }
    }
    window.IslandWorld = IslandWorld;
})();