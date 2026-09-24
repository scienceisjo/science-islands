(function() {
    'use strict';
    /* 레몬 백작의 부탁 — 3D 섬.
       공용 엔진(engine/world.js)의 IslandWorld 에서 섬마다 다른 부분(build·길·막힘·진행에 따른 변화)만 덮어쓴다.
       인물·건물은 모두 코드로 그린 도형이다(원본 PPT 그림은 쓰지 않는다). */
    const T = THREE,
        P = IslandWorld.prototype,
        M = IslandModel;

    /* 해 질 녘 보랏빛 하늘. 부탁을 해결할 때마다 그 구역의 창문·등불·나무 장식이 켜진다. */
    P.palette = {
        sky: '#231e3b',
        skyFestival: '#33285a',
        fog: '#3a2f52',
        water: '#2a4661',
        waterFestival: '#3a5d7d',
        darkSky: '#3b3060',
        darkWater: '#33506e',
        hemiSky: 0xcdb8ea,
        hemiGround: 0x3b2a33,
        sun: 0xffc27a,
        playerShirt: '#3e8f86',
        playerSkin: '#f0c7a0'
    };
    P.regionCount = M.quests.length;

    /* 길 — 나무·꽃을 피할 때와 미니 지도에 같이 쓴다 */
    const ROADS = [{
            w: 2.2,
            pts: [
                [-13.5, -5.9],
                [-11.8, -4.4],
                [-8, -3.5],
                [-5, -0.5],
                [-1, 1.5],
                [3.2, 2],
                [7, 2],
                [10, 2.5],
                [12, 4.2]
            ]
        },
        {
            w: 2,
            pts: [
                [-5, -0.5],
                [-8, 3.5],
                [-10.5, 7],
                [-12, 9.6]
            ]
        },
        {
            w: 1.7,
            pts: [
                [-8, 3.5],
                [-6, 7.5],
                [-4.3, 10.4]
            ]
        },
        {
            w: 1.9,
            pts: [
                [-5, -0.5],
                [-3, -5],
                [-0.5, -9],
                [3.2, -10],
                [7, -10],
                [10, -9.4],
                [12.6, -7.4]
            ]
        },
        {
            w: 1.8,
            pts: [
                [10, 2.5],
                [13, -1],
                [16, -2.4],
                [17.8, -2.8]
            ]
        },
        {
            w: 1.5,
            pts: [
                [13, -1],
                [12.8, -6.8]
            ]
        },
        {
            w: 1.5,
            pts: [
                [16, -2.4],
                [19, 1],
                [19.4, 6]
            ]
        }
    ];
    const LANDS = [
        [-21, 3, -18, 18],
        [7, 22, -18, 18]
    ];
    const BRIDGES = [2, -10];
    const PLAZA = {
        x: 14.6,
        z: 5.4,
        r: 3.3
    };
    const CAMP = {
        x: 0.6,
        z: -13.2
    };
    /* 레몬 성 안뜰: 낮은 성벽(카메라가 넘겨다볼 수 있게)과 앞쪽 성문. 처음 탐험은 여기, 레몬 백작 앞에서 시작한다. */
    const COURT = {
        x0: -18.4,
        x1: -8.6,
        z0: -12.4,
        z1: -6.6,
        gate: [-14.6, -11.4],
        spawn: {
            x: -13.5,
            z: -7.8
        },
        outside: {
            x: -13.5,
            z: -5.2
        }
    };
    const inCastle = (x, z, pad = 0) => x > -19.8 - pad && x < COURT.x1 + .6 + pad && z < COURT.z1 + .6 + pad;
    P.islandLayout = {
        roads: ROADS,
        lands: LANDS,
        bridges: BRIDGES,
        plaza: PLAZA,
        camp: CAMP,
        court: COURT,
        channel: [3.4, 6.6]
    };

    function segDist(x, z, a, b) {
        const dx = b[0] - a[0],
            dz = b[1] - a[1],
            L = dx * dx + dz * dz;
        const t = L ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L)) : 0;
        return Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t));
    }

    P.nearPath = function(x, z, pad = 1.6) {
        for (const r of ROADS)
            for (let i = 1; i < r.pts.length; i++)
                if (segDist(x, z, r.pts[i - 1], r.pts[i]) < r.w / 2 + pad * .6) return true;
        if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + pad * .5) return true;
        return false;
    };

    P.blocked = function(x, z) {
        if (x < -19.5 || x > 20.6 || z < -16.4 || z > 16.4) return true;
        if (x < COURT.x0 - .2 && z < COURT.z1 - .3 || x < -16.9 && z < COURT.z0) return true;
        if (x > 3.4 && x < 6.6 && BRIDGES.every(b => Math.abs(z - b) > 1.13)) return true;
        return this.colliders.some(c => c.r ? Math.hypot(x - c.x, z - c.z) < c.r + .28 : Math.abs(x - c.x) < c.w + .28 && Math.abs(z - c.z) < c.d + .28);
    };

    /* 구역 = 부탁 자리. 창문·등불·나무 장식이 가까운 부탁 자리의 구역에 묶여, 그 부탁을 풀면 켜진다. */
    const REGION_ANCHORS = M.quests.map(q => q.id === 0 ? {
        id: 0,
        x: -10.5,
        z: -5
    } : {
        id: q.id,
        x: q.x,
        z: q.z
    });
    const baseGo = P.go;
    P.go = function(q) {
        if (Math.hypot(q.x - this.player.position.x, q.z - this.player.position.z) < 3) {
            this.path = [];
            this.pendingNpc = null;
            this.cb.interact(q.id);
            return;
        }
        return baseGo.call(this, q);
    };

    const baseFindPath = P.findPath;
    P.findPath = function(tx, tz) {
        let path = baseFindPath.call(this, tx, tz);
        if (path.length || !this.blocked(tx, tz)) return path;
        for (const r of [.75, 1.5, 2.25])
            for (const [dx, dz] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
                path = baseFindPath.call(this, tx + dx * r, tz + dz * r);
                if (path.length) return path;
            }
        return [];
    };

    P.regionAt = function(x, z) {
        let region = 0,
            distance = Infinity;
        for (const q of REGION_ANCHORS) {
            const d = Math.hypot(x - q.x, z - q.z);
            if (d < distance) {
                distance = d;
                region = q.id;
            }
        }
        return region;
    };

    P.grassTexture = function(base, light, dark) {
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        const g = c.getContext('2d');
        g.fillStyle = base;
        g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 2300; i++) {
            const x = this.rnd() * 256,
                y = this.rnd() * 256;
            g.fillStyle = i % 3 === 0 ? light : dark;
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
    };

    P.glass = function(color, opacity = .45, emissive = null, intensity = .2) {
        const m = new T.MeshStandardMaterial({
            color: new T.Color(color).convertSRGBToLinear(),
            transparent: true,
            opacity,
            roughness: .12,
            metalness: .05,
            depthWrite: false
        });
        if (emissive) {
            m.emissive = new T.Color(emissive).convertSRGBToLinear();
            m.emissiveIntensity = intensity;
        }
        return m;
    };

    P.lemonTree = function(x, z, size = 1) {
        const g = new T.Group();
        g.position.set(x, .45, z);
        g.scale.setScalar(size);
        this.scene.add(g);
        this.cylinder(.17, .27, 1.55, '#9a6c43', 0, .75, 0, g, 7);
        const leaves = new T.Group();
        g.add(leaves);
        const yellows = ['#fff09a', '#fff6bf', '#ffe57c'].map(c => this.leafMat(c, .2));
        [
            [0, 2.2, 0, 1.15],
            [-.6, 1.85, .1, .85],
            [.58, 1.95, .15, .9],
            [.05, 1.9, -.6, .85],
            [.05, 2.8, .02, .75]
        ].forEach((a, i) => this.ball(a[3], yellows[i % 3], a[0], a[1], a[2], leaves, 1, .88, 1));
        [
            [-.72, 1.75, .72],
            [.66, 2.15, .7],
            [.1, 2.65, .66],
            [-.35, 2.3, -.8],
            [.8, 1.8, -.3]
        ].forEach(p => {
            this.ball(.2, this.leafMat('#ffc000', .32), ...p, leaves, .92, 1.25, .92);
            this.ball(.07, '#4f9a3f', p[0] + .06, p[1] + .23, p[2], leaves, 1.6, .5, .9);
        });
        this.mergeGroup(leaves);
        this.trees.push({
            g: leaves,
            offset: this.rnd() * 8
        });
        this.colliders.push({
            x,
            z,
            r: .62 * size
        });
    };

    /* 한 무리(나무 잎 등) 안의 메시를 재질마다 하나로 합친다 — 흔들림은 그대로, 그리는 횟수는 줄어든다 */
    P.mergeGroup = function(group) {
        const byMat = new Map();
        for (const m of [...group.children]) {
            if (!m.isMesh) continue;
            m.updateMatrix();
            if (!byMat.has(m.material)) byMat.set(m.material, []);
            byMat.get(m.material).push(m);
        }
        for (const [material, list] of byMat) {
            if (list.length < 2) continue;
            const pos = [],
                normal = [];
            let cast = false;
            for (const m of list) {
                const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
                g.applyMatrix4(m.matrix);
                pos.push(...g.attributes.position.array);
                normal.push(...g.attributes.normal.array);
                g.dispose();
                m.geometry.dispose();
                cast = cast || m.castShadow;
                group.remove(m);
            }
            const geo = new T.BufferGeometry();
            geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
            geo.setAttribute('normal', new T.Float32BufferAttribute(normal, 3));
            const mesh = new T.Mesh(geo, material);
            mesh.castShadow = cast;
            mesh.receiveShadow = true;
            group.add(mesh);
        }
    };

    /* 해 질 녘 빛에서도 노란 잎이 탁한 갈색으로 보이지 않게, 제 색으로 살짝 빛나는 재질 */
    P.leafMat = function(color, glow = .2) {
        const key = 'leaf_' + color + '_' + glow;
        return this.materials[key] || (this.materials[key] = new T.MeshStandardMaterial({
            color: new T.Color(color).convertSRGBToLinear(),
            emissive: new T.Color(color).convertSRGBToLinear(),
            emissiveIntensity: glow,
            roughness: .85
        }));
    };

    /* 나무 — 레몬 마을(서쪽)은 노란 잎, 비눗방울 마을(동쪽)은 비눗방울 덩어리 */
    P.tree = function(x, z, size = 1, fruit = false) {
        if (x > 5) return this.bubbleTree(x, z, size);
        const g = new T.Group();
        g.position.set(x, .45, z);
        g.scale.setScalar(size);
        this.scene.add(g);
        this.cylinder(.19, .31, 1.75, '#a57449', 0, .83, 0, g, 7);
        const colors = ['#ffd23f', '#ffe36a', '#f6bf22'].map(c => this.leafMat(c, .22));
        const leaves = new T.Group();
        g.add(leaves);
        [
            [0, 2.5, 0, 1.32],
            [-.65, 2.05, .12, .96],
            [.6, 2.18, .18, 1.0],
            [.08, 2.07, -.65, .95],
            [.05, 3.08, .03, .87]
        ].forEach((a, i) => this.ball(a[3], colors[i % 3], a[0], a[1], a[2], leaves, 1, .86, 1));
        if (fruit)[[-.66, 2.12, .87], [.6, 2.49, .78], [.06, 3, .72]].forEach(p => this.ball(.19, this.leafMat('#ff9a2a', .3), ...p, leaves));
        this.mergeGroup(leaves);
        this.trees.push({
            g: leaves,
            offset: this.rnd() * 8
        });
        this.colliders.push({
            x,
            z,
            r: .65 * size
        });
    };

    P.bubbleTree = function(x, z, size = 1) {
        const g = new T.Group();
        g.position.set(x, .45, z);
        g.scale.setScalar(size);
        this.scene.add(g);
        this.cylinder(.13, .22, 1.75, '#9a82c2', 0, .83, 0, g, 7);
        const mats = this.bubbleLeafMats || (this.bubbleLeafMats = [this.glass('#f4e4ff', .55, '#ff9fe6', .42), this.glass('#e2f2ff', .55, '#8fdcff', .4)]),
            mat = mats[Math.abs(Math.round(x * 3 + z)) % 2];
        const leaves = new T.Group();
        g.add(leaves);
        this.ball(.55, '#8f72c9', 0, 2.45, 0, leaves, 1, .9, 1);
        const cam = new T.Vector3(13, 21, 19.5).normalize();
        [
            [0, 2.62, .05, .92],
            [-.74, 2.12, .28, .64],
            [.72, 2.24, .22, .68],
            [.1, 2.18, -.72, .62],
            [.02, 3.3, .04, .56],
            [-.5, 2.92, .58, .44],
            [.58, 2.95, -.42, .42]
        ].map((b, i) => [...b, i]).sort((a, b) => (a[0] * cam.x + a[1] * cam.y + a[2] * cam.z) - (b[0] * cam.x + b[1] * cam.y + b[2] * cam.z)).forEach(([bx, by, bz, r, i]) => {
            const b = this.mesh(new T.SphereGeometry(r, 16, 12), mat, bx, by, bz, leaves);
            b.castShadow = false;
            this.ball(r * .17, '#ffffff', bx - r * .36, by + r * .46, bz + r * .56, leaves).castShadow = false;
        });
        this.mergeGroup(leaves);
        this.trees.push({
            g: leaves,
            offset: this.rnd() * 8
        });
        this.colliders.push({
            x,
            z,
            r: .6 * size
        });
    };

    /* 길 — 레몬 마을은 모래빛, 비눗방울 마을은 연보랏빛 돌길 */
    P.pathLine = function(points, width = 2) {
        const tone = x => x > 5 ? ['#e3d6f3', '#ebe2f8', '#efe8fb'] : ['#c4905c', '#d3a26c', '#dcb07a'];
        for (let i = 1; i < points.length; i++) {
            const a = points[i - 1],
                b = points[i],
                dx = b[0] - a[0],
                dz = b[1] - a[1],
                len = Math.hypot(dx, dz),
                c = tone((a[0] + b[0]) / 2);
            const p = this.box(width, .055, len + .2, c[0], (a[0] + b[0]) / 2, .46, (a[1] + b[1]) / 2);
            p.rotation.y = Math.atan2(dx, dz);
            p.castShadow = false;
            for (let d = .45; d < len; d += .85) {
                const f = d / len;
                for (let j = -1; j <= 1; j++) {
                    const xx = a[0] + dx * f + (dz / len) * j * .62,
                        zz = a[1] + dz * f - (dx / len) * j * .62;
                    const stone = this.box(.52, .018, .55, j % 2 ? tone(xx)[1] : tone(xx)[2], xx, .5, zz);
                    stone.rotation.y = Math.atan2(dx, dz) + (this.rnd() - .5) * .15;
                    stone.castShadow = false;
                }
            }
        }
        for (const p of points) {
            const m = this.cylinder(width * .52, width * .52, .04, tone(p[0])[0], p[0], .47, p[1], undefined, 20);
            m.castShadow = false;
        }
    };

    /* ── 인물: 모두 도형으로 만든다. userData.legs 는 걷기·숨쉬기 움직임에 쓰인다 ── */
    P.bodyParts = function(g, {
        shirt,
        arms,
        legs = '#566675',
        shoes = '#faf0d4',
        coat = null
    }) {
        this.cylinder(.3, .4, .7, shirt, 0, .73, 0, g);
        if (coat) this.cylinder(.34, .46, .78, coat, 0, .66, 0, g, 14);
        const legGroups = [];
        for (const x of [-.16, .16]) {
            const leg = new T.Group();
            leg.position.set(x, .42, 0);
            g.add(leg);
            this.cylinder(.105, .105, .31, legs, 0, -.12, 0, leg, 8);
            this.ball(.14, shoes, 0, -.26, .06, leg, 1, .6, 1.25);
            legGroups.push(leg);
            this.ball(.115, arms, x * 2.4, .69, .02, g, .85, 1.5, 1);
        }
        g.userData.legs = legGroups;
    };
    P.face = function(g, y, z, blush = '#e9a595', size = 1) {
        for (const x of [-.16, .16]) {
            this.ball(.041 * size, '#2f332c', x * size, y, z, g, .85, 1.22, .7);
            this.ball(.013 * size, '#fff8e9', x * size - .012, y + .02, z + .024, g);
            this.ball(.08 * size, blush, x * 1.65 * size, y - .13, z - .05, g, 1, .45, .3);
        }
        this.box(.12 * size, .025, .02, '#6d3b2f', 0, y - .15, z + .01, g);
    };
    P.humanHead = function(g, skin) {
        this.ball(.44, skin, 0, 1.38, .02, g, 1, 1.08, .95);
        this.face(g, 1.43, .402);
    };
    P.lemonHead = function(g, color, y = 1.5) {
        const head = this.ball(.5, color, 0, y, .02, g, 1, 1.22, .98);
        this.cylinder(0, .12, .22, color, 0, y + .66, .02, g, 8);
        this.ball(.12, '#5fa54a', .16, y + .64, 0, g, 1.7, .45, .8);
        this.face(g, y + .05, .48);
        return head;
    };

    P.makeCount = function() {
        const g = new T.Group();
        this.bodyParts(g, {
            shirt: '#46365a',
            arms: '#f4cf2f',
            legs: '#2f2a3a',
            shoes: '#6b4a3a'
        });
        this.box(.84, .95, .06, '#9b3a4d', 0, .95, -.3, g).rotation.x = .12;
        this.lemonHead(g, '#f4cf2f', 1.46);
        this.cylinder(.22, .2, .14, '#e3b53f', 0, 2.2, .02, g, 10);
        for (let i = 0; i < 5; i++) {
            const a = i * Math.PI * 2 / 5;
            this.ball(.05, '#fff0a8', Math.cos(a) * .19, 2.3, .02 + Math.sin(a) * .19, g);
        }
        this.ball(.07, '#e6b92a', 0, 1.46, .55, g, 1.2, .8, 1.4);
        return g;
    };
    P.makeScientist = function({
        hair,
        style
    }) {
        const g = new T.Group();
        this.bodyParts(g, {
            shirt: '#7f9fb8',
            arms: '#f0c9a4',
            coat: '#f6f5ee',
            legs: '#4a5563'
        });
        this.humanHead(g, '#f0c9a4');
        if (style === 'spiky') {
            this.ball(.46, hair, 0, 1.6, -.07, g, 1, .7, 1);
            for (let i = 0; i < 7; i++) {
                const a = -Math.PI * .95 + i * Math.PI * .95 / 3,
                    cone = this.cylinder(0, .12, .45, hair, Math.cos(a) * .36, 1.72 + Math.sin(i) * .05, -.1 + Math.sin(a) * .3, g, 6);
                cone.rotation.z = -Math.cos(a) * .9;
                cone.rotation.x = -Math.sin(a) * .6;
            }
            for (const x of [-.16, .16]) {
                const ring = this.mesh(new T.TorusGeometry(.1, .025, 6, 16), '#3f9fb2', x, 1.7, .34, g);
                ring.rotation.x = -.35;
            }
            this.box(.62, .04, .06, '#3f9fb2', 0, 1.7, .3, g);
            this.mesh(new T.SphereGeometry(.12, 12, 9), this.glass('#9ee07a', .7, '#9ee07a', .6), .42, .78, .22, g);
        } else {
            this.ball(.46, hair, 0, 1.58, -.08, g, 1, .74, 1);
            this.ball(.2, hair, 0, 1.98, -.22, g);
            this.box(.62, .13, .2, hair, 0, 1.67, .3, g);
            for (const x of [-.16, .16]) {
                const ring = this.mesh(new T.TorusGeometry(.1, .02, 6, 16), '#6b5b8a', x, 1.43, .43, g);
                ring.rotation.x = 0;
            }
            this.mesh(new T.SphereGeometry(.14, 12, 9), this.glass('#bfe8ff', .5, '#86d4ff', .5), .44, .82, .22, g);
        }
        return g;
    };
    P.makeBubbleFolk = function() {
        const g = new T.Group();
        this.bodyParts(g, {
            shirt: '#f1ebff',
            arms: '#fbf8ff',
            legs: '#6d5f8e'
        });
        this.cylinder(.2, .56, .72, '#e9e1ff', 0, .55, 0, g, 16);
        const head = this.mesh(new T.SphereGeometry(.5, 20, 16), this.glass('#d7f1ff', .42, '#8fdcff', .35), 0, 1.5, .02, g);
        head.castShadow = false;
        this.ball(.3, '#ece6ff', 0, 1.45, 0, g);
        this.face(g, 1.5, .28, '#f0a7c4', .9);
        this.ball(.08, '#ffffff', -.2, 1.78, .3, g);
        for (let i = 0; i < 3; i++) this.mesh(new T.SphereGeometry(.09 + i * .03, 10, 8), this.glass('#e4f6ff', .5, '#9fe3ff', .4), -.3 + i * .3, 2.1 + (i % 2) * .1, -.05, g);
        return g;
    };
    P.makeLemonKid = function(color) {
        const g = new T.Group();
        // 아이마다 제 피부 재질을 따로 둔다 — 치료 뒤 그 아이 색만 바꾸려고
        const skin = new T.MeshStandardMaterial({
            color: new T.Color(color).convertSRGBToLinear(),
            roughness: .9
        });
        this.bodyParts(g, {
            shirt: '#f2a54a',
            arms: skin,
            legs: '#6b7a86'
        });
        this.lemonHead(g, skin, 1.4);
        g.scale.setScalar(.72);
        g.userData.skin = skin;
        return g;
    };

    function addRingAndMarker(world, g) {
        const ring = world.mesh(new T.TorusGeometry(.71, .055, 8, 28), '#fff0ad', 0, .02, 0, g);
        ring.rotation.x = Math.PI / 2;
        const marker = world.ball(.18, '#ffdf85', 0, 2.45, 0, g);
        return {
            ring,
            marker
        };
    }

    /* 주민이 서는 자리: 그 주민의 부탁 중 아직 풀지 않은 첫 부탁의 자리(다 풀었으면 마지막 부탁 자리) */
    P.castSpot = function(cid) {
        const done = this.state.completed;
        if (cid === 4) return done.includes(5) ? {
            x: 13.6,
            z: 8.7
        } : this.state.sealedEntries?.[1] ? {
            x: 13.6,
            z: 8.7
        } : {
            x: -16.3,
            z: -8.9
        };
        const mine = M.quests.filter(q => q.npc === cid);
        const q = mine.find(x => !done.includes(x.id)) || mine[mine.length - 1];
        return {
            x: q.x,
            z: q.z
        };
    };

    P.buildCastle = function(cx, cz) {
        const g = new T.Group();
        g.position.set(cx, .44, cz);
        this.scene.add(g);
        this.box(9.2, .3, 5.6, '#cdbb8d', 0, .15, 0, g);
        this.box(5.6, 4.1, 3.5, '#f6e7bd', 0, 2.3, 0, g);
        this.box(5.9, .3, 3.8, '#e9cf8e', 0, 4.4, 0, g);
        for (let i = 0; i < 9; i++) this.box(.42, .42, .42, '#f2dca0', -2.8 + i * .7, 4.75, 1.75, g);
        const windowGlass = new T.MeshStandardMaterial({
                color: 0x6b6f86,
                emissive: 0xffbf63,
                emissiveIntensity: 0,
                roughness: .4
            }),
            wins = [];
        for (const x of [-1.9, -.65, .65, 1.9]) wins.push(this.box(.5, .8, .1, windowGlass, x, 3.1, 1.78, g));
        this.box(1.4, 2.1, .16, '#7a5a3a', 0, 1.25, 1.78, g);
        this.cylinder(.7, .7, .12, '#7a5a3a', 0, 2.3, 1.78, g, 16).rotation.x = Math.PI / 2;
        for (const [x, z] of [
                [-3.4, -1.9],
                [3.4, -1.9],
                [-3.4, 1.9],
                [3.4, 1.9]
            ]) {
            this.cylinder(.95, 1.05, 5.4, '#f3dea6', x, 2.9, z, g, 16);
            this.cylinder(1.1, 1.1, .25, '#e6cc88', x, 5.65, z, g, 16);
            this.ball(1.02, '#f5cf3a', x, 6.55, z, g, 1, 1.38, 1);
            this.cylinder(0, .2, .5, '#e0b52a', x, 8.05, z, g, 8);
            this.ball(.2, '#5fa54a', x + .28, 7.9, z, g, 1.8, .5, .9);
            wins.push(this.box(.38, .6, .1, windowGlass, x, 4.2, z + 1.02, g));
            this.cylinder(.03, .03, 1.4, '#8a6a4a', x, 8.8, z, g, 5);
            this.box(.7, .42, .03, x < 0 ? '#e8643c' : '#3f9fb2', x + .36, 9.25, z, g);
        }
        this.ball(1.65, '#f7d543', 0, 5.6, 0, g, 1, 1.25, 1);
        this.cylinder(0, .26, .7, '#e3b529', 0, 7.7, 0, g, 8);
        this.ball(.26, '#5fa54a', .38, 7.5, 0, g, 1.8, .5, .9);
        for (const material of new Set(wins.map(m => m.material))) this.registerFestivalLight(material, 0, {
            off: '#5e6178',
            on: '#ffe3a4',
            power: 1.8
        });
        windowGlass.dispose();
        this.colliders.push({
            x: cx,
            z: cz,
            w: 3.4,
            d: 2.2
        });
        for (const [x, z] of [
                [-3.4, -1.9],
                [3.4, -1.9],
                [-3.4, 1.9],
                [3.4, 1.9]
            ]) this.colliders.push({
            x: cx + x,
            z: cz + z,
            r: 1.05
        });
        return g;
    };

    P.buildCourtyard = function() {
        const T0 = .4,
            wall = (x, z, w, d, H = 1.25) => {
                this.box(w, H, d, '#f3e2b0', x, .44 + H / 2, z);
                const along = w > d,
                    len = along ? w : d;
                for (let o = -len / 2 + .3; o < len / 2 - .15; o += .78) this.box(.36, .3, .36, '#e9cf8e', along ? x + o : x, .44 + H + .15, along ? z : z + o);
                this.colliders.push({
                    x,
                    z,
                    w: w / 2,
                    d: d / 2
                });
            };
        const midZ = (COURT.z0 + COURT.z1) / 2,
            depth = COURT.z1 - COURT.z0,
            [g0, g1] = COURT.gate;
        wall(COURT.x0, midZ, T0, depth);
        wall(COURT.x1, midZ, T0, depth);
        // 앞 성벽은 낮게 — 카메라 쪽이라 안뜰의 캐릭터를 가리지 않도록
        wall((COURT.x0 + g0 - .5) / 2, COURT.z1, g0 - .5 - COURT.x0, T0, .85);
        // 동쪽 앞은 열린 뜰 — 오른쪽 성벽 끝에 작은 기둥만
        this.cylinder(.22, .26, 1.3, '#f3dea6', COURT.x1, .44 + .65, COURT.z1, undefined, 10);
        this.ball(.26, '#f5cf3a', COURT.x1, .44 + 1.45, COURT.z1, undefined, 1, 1.25, 1);
        // 성문 탑과 아치, 깃발 — 캐릭터를 가리면 집처럼 흐려진다
        const gate = new T.Group();
        this.scene.add(gate);
        for (const gx of [g0 - .25, g1 + .25]) {
            this.cylinder(.5, .56, 2.4, '#f3dea6', gx, .44 + 1.2, COURT.z1, gate, 14);
            this.ball(.54, '#f5cf3a', gx, .44 + 2.62, COURT.z1, gate, 1, 1.3, 1);
            this.cylinder(0, .1, .32, '#e0b52a', gx, .44 + 3.45, COURT.z1, gate, 8);
            this.cylinder(.025, .025, 1, '#8a6a4a', gx, .44 + 3.9, COURT.z1, gate, 5);
            this.box(.5, .3, .03, gx < -13.5 ? '#e8643c' : '#3f9fb2', gx + .26, .44 + 4.22, COURT.z1, gate);
            // 네모 충돌 상자(안쪽 면은 성벽 면과 나란히): 비스듬히 부딪혀도 옆으로 미끄러져 성문으로 나가도록
            this.colliders.push({
                x: gx,
                z: COURT.z1 + .26,
                w: .46,
                d: .46
            });
        }
        this.box(g1 - g0 + 1.1, .26, .34, '#e9cf8e', (g0 + g1) / 2, .44 + 2.3, COURT.z1, gate);
        this.ball(.22, '#f7d543', (g0 + g1) / 2, .44 + 2.62, COURT.z1, gate, 1, 1.25, 1);
        const fade = new Map();
        gate.traverse(m => {
            if (!m.isMesh) return;
            if (!fade.has(m.material.uuid)) {
                const mt = m.material.clone();
                mt.transparent = true;
                fade.set(m.material.uuid, mt);
            }
            m.material = fade.get(m.material.uuid);
        });
        this.houseFades.push({
            box: new T.Box3(new T.Vector3(g0 - .9, .45, COURT.z1 - .7), new T.Vector3(g1 + .9, 5, COURT.z1 + .7)),
            materials: [...fade.values()]
        });
        // 안뜰 돌바닥
        const floor = this.box(COURT.x1 - COURT.x0 - .2, .02, COURT.z1 + 10.8 + .2, '#ddd7e6', (COURT.x0 + COURT.x1) / 2, .462, (-10.8 + COURT.z1) / 2);
        floor.castShadow = false;
        for (let x = COURT.x0 + 1.2; x < COURT.x1 - .5; x += 1.2) this.box(.03, .022, COURT.z1 - -10.8, '#c9c1d6', x, .466, (-10.8 + COURT.z1) / 2).castShadow = false;
        // 성문에서 왕좌까지 붉은 융단
        const carpet = this.box(1.4, .03, 3.9, '#b83a4b', -13.5, .47, -8.5);
        carpet.castShadow = false;
        for (const dx of [-.62, .62]) this.box(.08, .035, 3.9, '#f0c24a', -13.5 + dx, .475, -8.5).castShadow = false;
        // 왕좌와 단 — 성 바닥판(앞 가장자리 z -10.8) 앞에 놓는다
        this.box(2.6, .36, .95, '#e9cf8e', -13.5, .62, -10.3);
        this.box(1.05, .5, .7, '#9b3a4d', -13.5, 1.05, -10.4);
        this.box(1.15, 1.5, .22, '#9b3a4d', -13.5, 1.55, -10.72);
        this.box(1.3, .14, .3, '#f0c24a', -13.5, 2.35, -10.72);
        for (let i = 0; i < 3; i++) this.cylinder(0, .09, .26, '#f0c24a', -13.85 + i * .35, 2.54, -10.72, undefined, 6);
        this.colliders.push({
            x: -13.5,
            z: -10.3,
            w: 1.3,
            d: .48
        });
        // 왕좌 옆 횃불
        for (const dx of [-1.7, 1.7]) {
            this.cylinder(.05, .07, 1.3, '#8a6a4a', -13.5 + dx, 1.1, -10.2);
            this.glow(.15, '#ffd96a', -13.5 + dx, 1.85, -10.2, 0);
        }
        // 의무실 구석: 침대와 즙 비교대
        this.box(1.1, .34, 1.9, '#d9b98a', -17.4, .62, -9.4);
        this.box(1, .14, 1.78, '#fff8e8', -17.4, .86, -9.4);
        this.box(.8, .16, .42, '#f6e7bd', -17.4, .98, -10.1);
        this.box(.9, .06, 1.2, '#f2b8c6', -17.4, .95, -9.0);
        this.colliders.push({
            x: -17.4,
            z: -9.4,
            w: .6,
            d: 1
        });
        this.box(.7, .08, 1.2, '#e8d6a8', -17.75, 1.2, -11.3);
        for (const dz of [-.46, .46]) this.box(.5, .75, .08, '#b89468', -17.75, .82, -11.3 + dz);
        [
            ['#f6d95a', -11.7],
            ['#e6e1b9', -11.3],
            ['#d4ecf6', -10.9]
        ].forEach(([c, z]) => this.mesh(new T.CylinderGeometry(.12, .1, .26, 12), this.glass(c, .75, c, .3), -17.75, 1.37, z).castShadow = false);
        this.colliders.push({
            x: -17.75,
            z: -11.3,
            w: .38,
            d: .62
        });
        // 오른쪽 성벽 아래 꽃밭
        for (let i = 0; i < 10; i++) this.flower(-9.7 + (i % 2) * .32, -10.4 + i * .36, ['#fff1a8', '#ffe066', '#f7c96b'][i % 3]);
        // 성 서쪽 틈·성 뒤 좁은 길 막기
        this.colliders.push({
            x: -19.1,
            z: COURT.z1,
            w: .55,
            d: .3
        }, {
            x: -13.5,
            z: -16.2,
            w: 4.2,
            d: .35
        });
        for (let i = 0; i < 3; i++) this.ball(.34, '#e0c24a', -19.2 + i * .12, .7, COURT.z1 - .1 + i * .05, undefined, 1.2, .8, 1);
    };

    /* ── Dr.에시드의 흩어진 실험 도구: 나무 상자 위 소품 + 빛나는 고리 + 떠 있는 표시. 필요한 하나만 보인다 ── */
    P.buildTools = function() {
        this.toolProps = {};
        const ringMat = new T.MeshStandardMaterial({
            color: new T.Color('#c9f6ff').convertSRGBToLinear(),
            emissive: new T.Color('#5fd8ff').convertSRGBToLinear(),
            emissiveIntensity: .9,
            roughness: .4
        });
        const markMat = new T.MeshStandardMaterial({
            color: new T.Color('#bff3ff').convertSRGBToLinear(),
            emissive: new T.Color('#46cfff').convertSRGBToLinear(),
            emissiveIntensity: .8,
            roughness: .35
        });
        const draw = {
            litmus: g => {
                for (let i = 0; i < 4; i++) this.box(.44, .025, .13, i % 2 ? '#6a93dc' : '#5580cf', -.02 + i * .03, .74 + i * .028, -.08 + i * .06, g).rotation.y = -.35 + i * .22;
                this.box(.46, .08, .1, '#f1e7c8', 0, .74, .2, g);
            },
            btb: g => {
                this.mesh(new T.CylinderGeometry(.11, .12, .3, 14), this.glass('#5db36d', .8, '#5db36d', .35), 0, .87, 0, g).castShadow = false;
                this.cylinder(.05, .06, .14, '#2f3a33', 0, 1.09, 0, g, 10);
                this.cylinder(.03, .02, .12, '#f6f5ee', 0, 1.2, 0, g, 8);
                this.cylinder(.121, .121, .08, '#fff8e6', 0, .85, 0, g, 14);
            },
            mg: g => {
                const coil = this.mesh(new T.TorusGeometry(.13, .028, 8, 18), '#cfd6dc', -.1, .76, 0, g);
                coil.rotation.x = Math.PI / 2;
                this.box(.24, .08, .15, '#d8483c', .14, .77, .02, g);
                this.box(.2, .02, .11, '#f5e3b8', .14, .82, .02, g);
                this.cylinder(.012, .012, .26, '#e8d2a0', .12, .84, .14, g, 5).rotation.z = Math.PI / 2;
                this.ball(.025, '#b0342b', .25, .84, .14, g);
            },
            conduct: g => {
                this.box(.36, .16, .24, '#3b4b5a', 0, .8, 0, g);
                this.ball(.08, '#ffe066', 0, .94, 0, g);
                for (const dx of [-.08, .08]) this.cylinder(.015, .015, .26, '#9aa3ad', dx, .62, .14, g, 5);
            },
            power: g => {
                this.box(.42, .24, .3, '#3b4b5a', 0, .84, 0, g);
                this.ball(.04, '#e05555', -.1, .98, .12, g);
                this.ball(.04, '#2f353c', .1, .98, .12, g);
                this.box(.3, .015, .1, '#6a93dc', .02, .97, -.06, g);
            },
            model: g => {
                this.box(.5, .06, .36, '#e8d6a8', 0, .75, 0, g);
                [
                    ['#7fca7c', -.14, -.08],
                    ['#f2a35b', 0, -.08],
                    ['#7fca7c', .14, -.08],
                    ['#f2a35b', -.14, .08],
                    ['#f3d766', 0, .08],
                    ['#f2a35b', .14, .08]
                ].forEach(([c, x, z]) => this.ball(.06, c, x, .83, z, g));
            }
        };
        for (const t of M.tools) {
            const g = new T.Group();
            g.position.set(t.x, .45, t.z);
            g.scale.setScalar(1.45);
            this.scene.add(g);
            this.box(.62, .36, .48, '#c89a5e', 0, .2, 0, g);
            this.box(.66, .06, .52, '#b3844b', 0, .4, 0, g);
            const prop = new T.Group();
            prop.position.y = -.3;
            g.add(prop);
            draw[t.id]?.(prop);
            this.mergeGroup(prop);
            g.traverse(m => {
                if (m.isMesh) m.castShadow = false;
            });
            const ring = this.mesh(new T.TorusGeometry(.62, .05, 8, 30), ringMat, 0, .03, 0, g);
            ring.rotation.x = Math.PI / 2;
            ring.castShadow = false;
            const mark = this.mesh(new T.OctahedronGeometry(.2), markMat, 0, 1.75, 0, g);
            mark.castShadow = false;
            g.visible = false;
            this.dynamic.push(g);
            this.toolProps[t.id] = {
                t,
                g,
                prop,
                ring,
                mark
            };
        }
    };

    /* 흩어진 도구 보이기: visible = 섬에 놓인 도구 id 들, focus = 지금 찾아야 할 하나(고리·표시·이름표) */
    P.setTools = function(visible = [], focus = null) {
        this.toolShown = null;
        this.toolsVisible = [];
        for (const [key, p] of Object.entries(this.toolProps || {})) {
            const on = visible.includes(key);
            p.g.visible = on;
            p.ring.visible = p.mark.visible = key === focus;
            if (on) this.toolsVisible.push(p);
            if (on && key === focus) this.toolShown = p;
        }
    };

    /* 보이는 도구 머리 위의 화면 좌표 — 이름표를 띄울 때 쓴다 */
    P.toolScreen = function() {
        const p = this.toolShown;
        if (!p) return null;
        const v = new T.Vector3(p.t.x, 2.7, p.t.z).project(this.camera);
        return {
            id: p.t.id,
            x: (v.x * .5 + .5) * this.canvas.clientWidth,
            y: (-.5 * v.y + .5) * this.canvas.clientHeight,
            visible: v.z < 1
        };
    };

    /* 도구 자리로 걸어가기 */
    P.goTool = function(id) {
        const p = this.toolProps?.[id];
        if (!p) return false;
        this.path = this.findPath(p.t.x, p.t.z);
        this.pendingNpc = null;
        return this.path.length > 0 || Math.hypot(p.t.x - this.player.position.x, p.t.z - this.player.position.z) < 1.5;
    };

    P.buildDomeLab = function(cx, cz, region) {
        const g = new T.Group();
        g.position.set(cx, .44, cz);
        this.scene.add(g);
        this.cylinder(2.9, 3, .22, '#b7b1c9', 0, .11, 0, g, 28);
        this.cylinder(2.55, 2.55, 2.6, '#ebe4f6', 0, 1.5, 0, g, 28);
        this.cylinder(2.7, 2.7, .22, '#cfc3e6', 0, 2.85, 0, g, 28);
        const dome = this.mesh(new T.SphereGeometry(2.55, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), this.glass('#bfe6ff', .5, '#7fd0ff', .22), 0, 2.95, 0, g);
        dome.castShadow = false;
        this.box(1.2, 1.9, .2, '#7d6aa6', 0, 1.15, 2.5, g);
        const windowGlass = new T.MeshStandardMaterial({
                color: 0x6f7896,
                emissive: 0xffbf63,
                emissiveIntensity: 0,
                roughness: .4
            }),
            wins = [];
        for (const a of [-.9, -.45, .45, .9]) wins.push(this.box(.55, .7, .1, windowGlass, Math.sin(a) * 2.56, 1.7, Math.cos(a) * 2.56, g));
        wins.forEach((w, i) => w.rotation.y = [-.9, -.45, .45, .9][i]);
        for (const material of new Set(wins.map(m => m.material))) this.registerFestivalLight(material, region, {
            off: '#626b86',
            on: '#d9f3ff',
            power: 1.8
        });
        windowGlass.dispose();
        for (let i = 0; i < 5; i++) {
            const b = this.mesh(new T.SphereGeometry(.18 + (i % 3) * .07, 12, 9), this.glass('#dff5ff', .45, '#9ae3ff', .3), -1.4 + i * .7, 4.4 + Math.sin(i) * .6, -.4 + (i % 2) * .5, g);
            b.castShadow = false;
        }
        this.colliders.push({
            x: cx,
            z: cz,
            r: 2.75
        });
        return g;
    };

    P.benchTable = function(x, z, top = '#b88a5c') {
        this.box(2.4, .12, 1.1, top, x, 1.32, z);
        for (const [dx, dz] of [
                [-1.05, -.42],
                [1.05, -.42],
                [-1.05, .42],
                [1.05, .42]
            ]) this.box(.1, .85, .1, '#7c5a3c', x + dx, .88, z + dz);
        this.colliders.push({
            x,
            z,
            w: 1.25,
            d: .6
        });
    };

    P.build = function() {
        this.lemonGrass = new T.MeshStandardMaterial({
            map: this.grassTexture('#e8d46e', 'rgba(255,246,175,.35)', 'rgba(165,120,30,.12)'),
            color: new T.Color('#fffbe6').convertSRGBToLinear(),
            emissive: new T.Color('#2b2408').convertSRGBToLinear(),
            roughness: 1
        });
        this.borderGrass = new T.MeshStandardMaterial({
            map: this.grassTexture('#a590d2', 'rgba(240,226,255,.26)', 'rgba(80,55,140,.14)'),
            color: new T.Color('#fcf8ff').convertSRGBToLinear(),
            roughness: 1
        });
        this.waterMat = new T.MeshStandardMaterial({
            color: new T.Color(this.pal.water).convertSRGBToLinear(),
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
        this.dynamic = [];

        this.grass = this.lemonGrass;
        this.terrain(...LANDS[0]);
        this.grass = this.borderGrass;
        this.terrain(...LANDS[1]);
        for (const r of ROADS) this.pathLine(r.pts, r.w);
        for (const z of BRIDGES) {
            for (let x = 2.5; x <= 7.5; x += .27) this.box(.23, .22, 2.7, '#c29a68', x, .57, z);
            for (const zz of [z - 1.4, z + 1.4]) {
                this.box(5.4, .12, .12, '#eed5a0', 5, 1.35, zz);
                for (const x of [2.5, 3.8, 5, 6.2, 7.5]) this.box(.14, 1.1, .14, '#b88954', x, .93, zz);
            }
        }
        // 강 한가운데 경계 표지 — 노랑(산 대륙)과 하늘(버블 왕국) 부표
        for (let i = 0; i < 7; i++) this.cylinder(.22, .28, .5, i % 2 ? '#b49ddd' : '#f3d24a', 5, -.1, -15 + i * 5, undefined, 10);

        /* 레몬 왕국 */
        this.buildCastle(-13.5, -13.6);
        this.buildCourtyard();
        this.house(-14, 6.3, '#e2a23a', '#fff3d2');
        for (const [dx, dz, c] of [
                [2.6, 2.1, '#9ee07a'],
                [3.1, 1.7, '#f2d24a'],
                [2.9, 2.6, '#e0626a']
            ]) {
            const flask = this.mesh(new T.SphereGeometry(.3, 12, 9), this.glass(c, .7, c, .45), -14 + dx, .78, 6.3 + dz);
            flask.castShadow = false;
            this.cylinder(.08, .1, .35, '#e8eef2', -14 + dx, 1.15, 6.3 + dz, undefined, 8);
        }
        this.puffs = [];
        for (let i = 0; i < 4; i++) {
            const puff = this.mesh(new T.SphereGeometry(.3 + i * .08, 10, 8), this.glass(i % 2 ? '#d9f7c4' : '#fff2b0', .35), -12.75 + i * .15, 4.9 + i * .55, 5.6 - i * .1);
            puff.castShadow = false;
            this.dynamic.push(puff);
            this.puffs.push({
                m: puff,
                y: puff.position.y
            });
        }
        this.benchTable(-5.8, 12.3);
        for (let i = 0; i < 3; i++) {
            const cup = this.mesh(new T.CylinderGeometry(.18, .16, .38, 14), this.glass('#d7eef7', .45), -5.8 + i * .5, 1.57, 12.1);
            cup.castShadow = false;
        }
        this.box(1.8, .03, .03, '#c77a3a', -5.6, 1.42, 12.62);

        /* 경계 마을 */
        this.buildDomeLab(14.6, -12.2, 3);
        this.benchTable(19.2, -5.2, '#b9a6e2');
        for (let i = 0; i < 3; i++) {
            const b = this.mesh(new T.CylinderGeometry(.2, .17, .44, 14), this.glass(['#6fa0e8', '#5db36d', '#f2d24a'][i], .65, ['#6fa0e8', '#5db36d', '#f2d24a'][i], .3), 18.6 + i * .6, 1.6, -5.1);
            b.castShadow = false;
        }
        this.cylinder(.04, .04, 1.6, '#8c95a6', 20.1, 2.1, -5.4, undefined, 6);
        this.cylinder(.06, .04, .9, '#e3eef7', 20.1, 2.65, -5.25, undefined, 8);
        this.house(10.3, 11.6, '#9b7ed6', '#f7f0ff');
        this.house(17.2, 12.1, '#c29be8', '#fbf5ff');
        this.house(9.6, -14.6, '#b7a2e0', '#f6f0ff');
        // 비눗방울 지붕 오두막
        this.cylinder(1.5, 1.6, 1.8, '#f0f5ff', 20, 1.34, 9.2, undefined, 20);
        const hut = this.mesh(new T.SphereGeometry(1.7, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), this.glass('#c9ecff', .6, '#8fdcff', .3), 20, 2.24, 9.2);
        hut.castShadow = false;
        this.box(.8, 1.2, .1, '#8a78b8', 20, 1.04, 10.75);
        this.colliders.push({
            x: 20,
            z: 9.2,
            r: 1.7
        });
        // 광장과 분수
        const plaza = this.cylinder(PLAZA.r, PLAZA.r, .1, '#e6dbf4', PLAZA.x, .49, PLAZA.z, undefined, 40);
        plaza.castShadow = false;
        for (let i = 0; i < 20; i++) {
            const a = i * Math.PI * 2 / 20;
            this.box(.55, .018, .6, i % 2 ? '#f1eafb' : '#cdb9ec', PLAZA.x + Math.cos(a) * 2.75, .555, PLAZA.z + Math.sin(a) * 2.75).rotation.y = -a;
        }
        this.cylinder(1.25, 1.35, .42, '#dfe6ef', PLAZA.x, .72, PLAZA.z, undefined, 24);
        const pool = this.mesh(new T.CylinderGeometry(1.08, 1.08, .06, 24), this.glass('#7fc6ee', .75, '#7fc6ee', .3), PLAZA.x, .93, PLAZA.z);
        pool.castShadow = false;
        this.cylinder(.16, .22, 1.2, '#dfe6ef', PLAZA.x, 1.4, PLAZA.z, undefined, 12);
        const spout = this.mesh(new T.SphereGeometry(.36, 16, 12), this.glass('#d7f1ff', .5, '#9fe3ff', .45), PLAZA.x, 2.15, PLAZA.z);
        spout.castShadow = false;
        this.dynamic.push(spout);
        this.fountainTop = spout;
        this.colliders.push({
            x: PLAZA.x,
            z: PLAZA.z,
            r: 1.4
        });
        for (const [x, z, ry] of [
                [PLAZA.x - 2.1, PLAZA.z + 2.3, .7],
                [PLAZA.x + 2.2, PLAZA.z + 2.1, -.75]
            ]) {
            const seat = this.box(1.5, .14, .5, '#bf915b', x, .88, z);
            seat.rotation.y = ry;
            this.colliders.push({
                x,
                z,
                w: .7,
                d: .4
            });
        }
        // 동쪽 모래사장과 비눗방울 기계
        const beach = this.box(1.7, .05, 31, '#eadff5', 21.1, .47, 0);
        beach.castShadow = false;
        this.cylinder(.5, .6, 1.1, '#9f8bd0', 20.4, 1, -12.4, undefined, 14);
        this.mesh(new T.TorusGeometry(.42, .07, 8, 20), '#e3d8ff', 20.4, 1.8, -12.4).rotation.x = Math.PI / 2;
        this.colliders.push({
            x: 20.4,
            z: -12.4,
            r: .7
        });

        this.buildTools();

        /* 내 연구 텐트 */
        const tent = new T.ConeGeometry(1.75, 2.1, 4);
        tent.rotateY(Math.PI / 4);
        this.mesh(tent, '#f0d68c', CAMP.x, 1.5, CAMP.z);
        this.box(.8, 1.05, .08, '#8a7a5c', CAMP.x, 1.02, CAMP.z + 1.02);
        this.colliders.push({
            x: CAMP.x,
            z: CAMP.z,
            r: 1.4
        });
        this.campDecor = new T.Group();
        this.campDecor.position.set(CAMP.x - 1.8, .5, CAMP.z + 1.7);
        this.scene.add(this.campDecor);
        this.lamp(CAMP.x + 1.6, CAMP.z + 1.4, 0);

        /* 과수원·나무·꽃 — 여기서부터는 고정 씨앗(길·건물을 고쳐도 숲 배치가 그대로) */
        this.seed = 4871;
        for (const [x, z] of [
                [-17.6, -4.9],
                [-15.5, -3.5],
                [-18, -1],
                [-16, 1.5],
                [-18.5, 3.5],
                [-6.4, -9.8],
                [-4.5, -12.5],
                [-17.6, 12.5],
                [-9.5, 13.8],
                [-1.2, 5.5],
                [0.8, -3.5]
            ]) this.lemonTree(x, z, .95 + this.rnd() * .2);
        for (let i = 0; i < 90; i++) {
            const west = i < 50;
            const x = west ? -19 + this.rnd() * 21 : 8 + this.rnd() * 12.5,
                z = -15.5 + this.rnd() * 31;
            if (this.nearPath(x, z) || this.colliders.some(c => c.r ? Math.hypot(x - c.x, z - c.z) < c.r + 1.4 : Math.abs(x - c.x) < c.w + 1.5 && Math.abs(z - c.z) < c.d + 1.5)) continue;
            if (M.quests.some(q => Math.hypot(x - q.x, z - q.z) < 3) || Math.hypot(x - CAMP.x, z - CAMP.z) < 3 || inCastle(x, z, 1) || M.tools.some(t => {
                    const dx = x - t.x,
                        dz = z - t.z,
                        along = dx * .555 + dz * .832;
                    return Math.hypot(dx, dz) < 2.2 || along > 0 && along < 4 && Math.abs(dx * .832 - dz * .555) < 1.5;
                })) continue;
            if (!west && x > 20) continue;
            if (west && this.rnd() < .35) this.lemonTree(x, z, .8 + this.rnd() * .35);
            else this.tree(x, z, .75 + this.rnd() * .4, false);
        }
        for (let i = 0; i < 360; i++) {
            const west = i % 2 === 0;
            const x = west ? -19 + this.rnd() * 21.5 : 8 + this.rnd() * 12,
                z = -15.5 + this.rnd() * 31;
            if (this.nearPath(x, z, .8) || Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + .4 || inCastle(x, z) || M.tools.some(t => Math.hypot(x - t.x, z - t.z) < 1.2)) continue;
            this.flower(x, z, west ? ['#fff1a8', '#ffe066', '#f8f9e6', '#f7c96b'][i % 4] : ['#b3abe9', '#8dcced', '#f8f9ff', '#d9c2ff'][i % 4]);
        }
        for (const [x, z] of [
                [-16.2, -5.5],
                [-10.8, -5.5],
                [-3.5, -2.8],
                [-9.2, 4.6],
                [-6.6, 9.6],
                [1.5, 3.6],
                [1.5, -8.2],
                [9.4, 4.4],
                [11.4, -9.8],
                [15.2, -1],
                [18.6, 1.8],
                [11.6, 8.8],
                [17.4, 8.4]
            ]) this.lamp(x, z, this.regionAt(x, z));

        /* 주민 */
        const looks = [
            () => this.makeCount(),
            () => this.makeScientist({
                hair: '#e7ecf4',
                style: 'spiky'
            }),
            () => this.makeScientist({
                hair: '#ef8fb8',
                style: 'bun'
            }),
            () => this.makeBubbleFolk(),
            () => this.makeLemonKid('#d8d3a6')
        ];
        M.cast.forEach(c => {
            const g = looks[c.id]();
            const spot = this.castSpot(c.id),
                q = {
                    id: c.id,
                    x: spot.x,
                    z: spot.z
                };
            g.position.set(q.x, .45, q.z);
            g.rotation.y = .25;
            this.scene.add(g);
            const {
                ring,
                marker
            } = addRingAndMarker(this, g);
            this.npcs.push({
                q,
                g,
                marker,
                ring
            });
        });
        /* 광장의 다른 아이들 — 치료 전엔 색이 바래 앉아 있고, 치료 뒤엔 뛰논다 */
        this.kids = [];
        for (const [x, z, bubble] of [
                [PLAZA.x + 1.7, PLAZA.z + .6, false],
                [PLAZA.x + .5, PLAZA.z + 2.8, false],
                [PLAZA.x + 2.6, PLAZA.z - 1.5, true]
            ]) {
            const g = bubble ? this.makeBubbleFolk() : this.makeLemonKid('#d8d3a6');
            if (bubble) g.scale.setScalar(.7);
            g.position.set(x, .45, z);
            g.rotation.y = .6;
            this.scene.add(g);
            this.dynamic.push(g);
            this.kids.push({
                g,
                bubble,
                phase: this.rnd() * 6
            });
            this.colliders.push({
                x,
                z,
                r: .45
            });
        }

        /* 비눗방울 — 동쪽 바다에서 경계 마을로 날아든다 */
        this.bubbles = [];
        const bubbleMat = this.glass('#d4f0ff', .3, '#86d6ff', .28);
        for (let i = 0; i < 18; i++) {
            const g = new T.Group();
            const r = .22 + this.rnd() * .32;
            const s = this.mesh(new T.SphereGeometry(r, 16, 12), bubbleMat, 0, 0, 0, g);
            s.castShadow = false;
            this.ball(r * .22, '#ffffff', -r * .4, r * .45, r * .5, g).castShadow = false;
            g.userData = {
                r,
                speed: .5 + this.rnd() * .6,
                rise: .08 + this.rnd() * .12,
                wobble: this.rnd() * 6
            };
            this.placeBubble(g, true);
            this.scene.add(g);
            this.dynamic.push(g);
            this.bubbles.push(g);
        }
        this.bubbleMat = bubbleMat;

        this.clouds = [];
        for (let i = 0; i < 7; i++) {
            const group = new T.Group();
            group.position.set(-36 + i * 12, 12 + this.rnd() * 5, -29 - this.rnd() * 8);
            this.scene.add(group);
            for (let j = 0; j < 4; j++) this.ball(1.3, '#ece3f6', j * 1.25, Math.sin(j) * .3, 0, group, 1.5, .5, .75);
            this.clouds.push(group);
        }
    };

    P.placeBubble = function(g, anywhere) {
        const x = anywhere ? 8 + this.rnd() * 18 : 22 + this.rnd() * 8;
        g.position.set(x, .9 + this.rnd() * (anywhere ? 3.2 : .8), -13 + this.rnd() * 24);
        g.userData.age = 0;
        g.visible = true;
    };

    /* 축제 때 나무에 켜지는 등불 — 엔진과 같되 색만 섬에 맞춘다 */
    P.buildFestivalDecor = function() {
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
                on: q <= 2 ? '#bff4ff' : '#ffe1a1',
                points: true
            });
        }
    };

    /* 움직이는 소품은 한데 묶어(배칭) 굳히지 않는다 */
    const baseBatch = P.batchStatic;
    P.batchStatic = function() {
        const saved = this.clouds;
        this.clouds = [...(this.clouds || []), ...(this.dynamic || [])];
        baseBatch.call(this);
        this.clouds = saved;
    };

    /* 진행에 따라 섬이 달라진다: 주민의 자리, 새콤과 아이들의 색, 텐트의 선물 */
    P.applyProgress = function() {
        const done = this.state.completed;
        if (this.player && !this.spawnChecked) {
            this.spawnChecked = true;
            const p = this.player.position;
            if (this.blocked(p.x, p.z)) {
                let spot = null;
                for (const r of [.75, 1.5, 2.25, 3])
                    for (const [dx, dz] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]])
                        if (!spot && !this.blocked(p.x + dx * r, p.z + dz * r)) spot = [p.x + dx * r, p.z + dz * r];
                if (!spot) spot = [COURT.outside.x, COURT.outside.z];
                p.set(spot[0], p.y, spot[1]);
                this.camTarget.copy(p);
            }
            if (Math.hypot(p.x - COURT.outside.x, p.z - COURT.outside.z) > 1 && !this.findPath(COURT.outside.x, COURT.outside.z).length) {
                p.set(COURT.spawn.x, p.y, COURT.spawn.z);
                this.camTarget.copy(p);
            }
        }
        if (!this.festivalRun) this.restoreFestivalLights();
        const healed = done.includes(5);
        for (const n of this.npcs) {
            const spot = this.castSpot(n.q.id);
            n.q.x = spot.x;
            n.q.z = spot.z;
            n.g.position.x = spot.x;
            n.g.position.z = spot.z;
            const mine = M.quests.filter(q => q.npc === n.q.id);
            const open = mine.some(q => !done.includes(q.id));
            n.marker.material = this.mat(n.q.id === 4 ? (healed ? '#a7d6b1' : '#f2c3a0') : open ? '#ffdc80' : '#a7d6b1');
            if (n.q.id === 4) this.tintLemonKid(n.g, healed);
        }
        for (const k of this.kids || [])
            if (!k.bubble) this.tintLemonKid(k.g, healed);
        while (this.campDecor.children.length) this.campDecor.remove(this.campDecor.children[0]);
        const c = this.campDecor;
        if (done.includes(0)) {
            this.cylinder(.03, .03, 1.4, '#8a6a4a', 0, .7, 0, c, 5);
            this.box(.5, .32, .03, '#f5cf3a', .26, 1.25, 0, c);
        }
        if (done.includes(1)) {
            this.cylinder(.05, .05, 1.2, '#8a6a4a', .8, .6, .1, c, 5);
            this.cylinder(.22, .3, .7, '#f6f5ee', .8, .95, .1, c, 10);
        }
        if (done.includes(2)) {
            const lens = this.mesh(new T.TorusGeometry(.2, .04, 8, 18), '#c99a3a', 1.5, .5, .4, c);
            lens.rotation.x = -.9;
            this.box(.06, .06, .35, '#6b4a3a', 1.5, .38, .65, c);
        }
        if (done.includes(3)) this.mesh(new T.SphereGeometry(.26, 14, 10), this.glass('#d4f0ff', .55, '#86d6ff', .4), -.7, .3, .5, c);
        if (done.includes(4)) this.box(.45, .1, .34, '#e8d6a8', -.2, .06, .9, c);
        if (done.includes(5)) {
            this.box(.4, .35, .4, '#fff4d8', 2.2, .18, -.2, c);
            this.cylinder(0, .32, .3, '#efc23b', 2.2, .5, -.2, c, 4);
        }
        if (done.length) {
            const lantern = new T.MeshStandardMaterial({
                color: new T.Color({
                    lemon: '#fff0a0',
                    mint: '#bff3dc',
                    bubble: '#d4ecff'
                } [this.state.camp] || '#fff0a0').convertSRGBToLinear(),
                emissive: new T.Color('#ffd98a').convertSRGBToLinear(),
                emissiveIntensity: .8,
                roughness: .4
            });
            this.cylinder(.03, .03, .5, '#8a6a4a', 1.1, 1.1, -.4, c, 5);
            this.mesh(new T.SphereGeometry(.16, 12, 9), lantern, 1.1, 1.42, -.4, c).castShadow = false;
        }
    };

    P.tintLemonKid = function(g, healed) {
        const skin = g.userData.skin;
        if (!skin) return;
        skin.color.set(healed ? '#f7d23a' : '#d8d3a6').convertSRGBToLinear();
        g.userData.healed = healed;
    };

    /* 매 프레임 — 비눗방울, 아이들, 연기, 분수 */
    const baseFrame = P.frame;
    P.frame = function(now) {
        const t = this.time || 0;
        if (this.bubbles && (!this.state.calm || this.festivalRun)) {
            const dt = Math.min((now - (this.islandLast || now)) / 1000, .04);
            for (const b of this.bubbles) {
                const u = b.userData;
                u.age += dt;
                b.position.x -= u.speed * dt * (this.state.festival ? .6 : 1);
                b.position.y += u.rise * dt;
                b.position.z += Math.sin(t * .8 + u.wobble) * dt * .25;
                if (b.position.x < 7.8 || b.position.y > 6.5) this.placeBubble(b, false);
            }
        }
        this.islandLast = now;
        const tool = this.toolShown;
        if (tool) {
            tool.mark.position.y = 1.55 + (this.state.calm ? 0 : Math.sin(t * 2.4) * .1);
            tool.mark.rotation.y = this.state.calm ? 0 : t * 1.6;
            tool.ring.scale.setScalar(this.state.calm ? 1 : 1 + Math.sin(t * 3) * .06);
        }
        if (this.toolsVisible?.length && !this.paused && !this.festivalRun && this.player && this.state.started)
            for (const p of this.toolsVisible)
                if (p.g.visible && Math.hypot(p.t.x - this.player.position.x, p.t.z - this.player.position.z) < 1.3) {
                    p.g.visible = false;
                    this.toolsVisible = this.toolsVisible.filter(x => x !== p);
                    if (this.toolShown === p) {
                        this.toolShown = null;
                        if (this.pendingNpc == null) this.path = [];
                    }
                    this.cb.pick?.(p.t.id);
                    break;
                }
        if (!this.state.calm) {
            if (this.fountainTop) this.fountainTop.scale.setScalar(1 + Math.sin(t * 3) * .06);
            for (const [i, p] of (this.puffs || []).entries()) p.m.position.y = p.y + Math.sin(t * .9 + i) * .12;
            for (const k of this.kids || []) {
                const hop = k.g.userData.healed || k.bubble && this.state.completed.includes(5);
                k.g.position.y = .45 + (hop ? Math.abs(Math.sin(t * 3 + k.phase)) * .35 : 0);
                k.g.rotation.y = hop ? .6 + Math.sin(t + k.phase) * .8 : .6;
            }
        }
        return baseFrame.call(this, now);
    };
})();
