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
                [-11.5, -10.2],
                [-10.5, -7.5],
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
    P.islandLayout = {
        roads: ROADS,
        lands: LANDS,
        bridges: BRIDGES,
        plaza: PLAZA,
        camp: CAMP,
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
        if (x > 3.4 && x < 6.6 && BRIDGES.every(b => Math.abs(z - b) > 1.13)) return true;
        return this.colliders.some(c => c.r ? Math.hypot(x - c.x, z - c.z) < c.r + .28 : Math.abs(x - c.x) < c.w + .28 && Math.abs(z - c.z) < c.d + .28);
    };

    /* 구역 = 부탁 자리. 창문·등불·나무 장식이 가까운 부탁 자리의 구역에 묶여, 그 부탁을 풀면 켜진다. */
    P.regionAt = function(x, z) {
        let region = 0,
            distance = Infinity;
        for (const q of M.quests) {
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
        const greens = ['#4f8f4a', '#5e9f53', '#6aab58'];
        [
            [0, 2.2, 0, 1.15],
            [-.6, 1.85, .1, .85],
            [.58, 1.95, .15, .9],
            [.05, 1.9, -.6, .85],
            [.05, 2.8, .02, .75]
        ].forEach((a, i) => this.ball(a[3], greens[i % 3], a[0], a[1], a[2], leaves, 1, .88, 1));
        [
            [-.72, 1.75, .72],
            [.66, 2.15, .7],
            [.1, 2.65, .66],
            [-.35, 2.3, -.8],
            [.8, 1.8, -.3]
        ].forEach(p => this.ball(.17, '#f5d23a', ...p, leaves, .92, 1.25, .92));
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
            shirt: '#b49ddd',
            arms: '#dcd2f2',
            legs: '#6d5f8e'
        });
        this.cylinder(.2, .56, .72, '#c3aee8', 0, .55, 0, g, 16);
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
        } : {
            x: -8.6,
            z: -6.4
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
            map: this.grassTexture('#a8cf6c', 'rgba(250,240,150,.2)', 'rgba(60,110,40,.1)'),
            color: new T.Color('#fbfff0').convertSRGBToLinear(),
            roughness: 1
        });
        this.borderGrass = new T.MeshStandardMaterial({
            map: this.grassTexture('#98cfa0', 'rgba(210,240,255,.18)', 'rgba(50,100,90,.1)'),
            color: new T.Color('#f6fbff').convertSRGBToLinear(),
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
        for (let i = 0; i < 7; i++) this.cylinder(.22, .28, .5, i % 2 ? '#8fd0f0' : '#f3d24a', 5, -.1, -15 + i * 5, undefined, 10);

        /* 레몬 왕국 */
        this.buildCastle(-13.5, -13.6);
        this.house(-14, 6.3, '#5d8f8a', '#f3ead2');
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
        this.box(.55, .5, .35, '#3b4b5a', -6.6, 1.63, 12.3);
        this.box(.14, .1, .14, '#e05555', -6.72, 1.93, 12.3);
        this.box(.14, .1, .14, '#333b44', -6.48, 1.93, 12.3);
        for (let i = 0; i < 3; i++) {
            const cup = this.mesh(new T.CylinderGeometry(.18, .16, .38, 14), this.glass('#d7eef7', .45), -5.8 + i * .5, 1.57, 12.1);
            cup.castShadow = false;
        }
        this.glow(.12, '#ffd96a', -4.7, 1.72, 12.3, 2);
        this.box(1.8, .03, .03, '#c77a3a', -5.6, 1.42, 12.62);

        /* 경계 마을 */
        this.buildDomeLab(14.6, -12.2, 3);
        this.benchTable(19.2, -5.2, '#a8b9d6');
        for (let i = 0; i < 3; i++) {
            const b = this.mesh(new T.CylinderGeometry(.2, .17, .44, 14), this.glass(['#6fa0e8', '#5db36d', '#f2d24a'][i], .65, ['#6fa0e8', '#5db36d', '#f2d24a'][i], .3), 18.6 + i * .6, 1.6, -5.1);
            b.castShadow = false;
        }
        this.cylinder(.04, .04, 1.6, '#8c95a6', 20.1, 2.1, -5.4, undefined, 6);
        this.cylinder(.06, .04, .9, '#e3eef7', 20.1, 2.65, -5.25, undefined, 8);
        this.house(10.3, 11.6, '#efc23b', '#fff4d8');
        this.house(17.2, 12.1, '#79b8dd', '#eef5ff');
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
        const plaza = this.cylinder(PLAZA.r, PLAZA.r, .1, '#e7cfa6', PLAZA.x, .49, PLAZA.z, undefined, 40);
        plaza.castShadow = false;
        for (let i = 0; i < 20; i++) {
            const a = i * Math.PI * 2 / 20;
            this.box(.55, .018, .6, i % 2 ? '#efdcb8' : '#d9bf8f', PLAZA.x + Math.cos(a) * 2.75, .555, PLAZA.z + Math.sin(a) * 2.75).rotation.y = -a;
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
        const beach = this.box(1.7, .05, 31, '#efdcaa', 21.1, .47, 0);
        beach.castShadow = false;
        this.cylinder(.5, .6, 1.1, '#9f8bd0', 20.4, 1, -12.4, undefined, 14);
        this.mesh(new T.TorusGeometry(.42, .07, 8, 20), '#e3d8ff', 20.4, 1.8, -12.4).rotation.x = Math.PI / 2;
        this.colliders.push({
            x: 20.4,
            z: -12.4,
            r: .7
        });

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

        /* 과수원·나무·꽃 */
        for (const [x, z] of [
                [-17.5, -6],
                [-15.5, -3.5],
                [-18, -1],
                [-16, 1.5],
                [-18.5, 3.5],
                [-7.5, -9.5],
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
            if (M.quests.some(q => Math.hypot(x - q.x, z - q.z) < 3) || Math.hypot(x - CAMP.x, z - CAMP.z) < 3 || Math.hypot(x + 8.6, z + 6.4) < 2.5) continue;
            if (!west && x > 20) continue;
            if (west && this.rnd() < .35) this.lemonTree(x, z, .8 + this.rnd() * .35);
            else this.tree(x, z, .75 + this.rnd() * .4, false);
        }
        for (let i = 0; i < 360; i++) {
            const west = i % 2 === 0;
            const x = west ? -19 + this.rnd() * 21.5 : 8 + this.rnd() * 12,
                z = -15.5 + this.rnd() * 31;
            if (this.nearPath(x, z, .8) || Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + .4) continue;
            this.flower(x, z, west ? ['#fff1a8', '#ffe066', '#f8f9e6', '#f7c96b'][i % 4] : ['#b3abe9', '#8dcced', '#f8f9ff', '#d9c2ff'][i % 4]);
        }
        for (const [x, z] of [
                [-8.8, -8.8],
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
