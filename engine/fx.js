(function() {
    let active, timer, animation = 0,
        cleanup = null;
    const motion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion:reduce)') : null;

    function clear() {
        clearTimeout(timer);
        cancelAnimationFrame(animation);
        animation = 0;
        if (cleanup) {
            cleanup();
            cleanup = null;
        }
        if (active) {
            try {
                if (active.matches?.(':popover-open')) active.hidePopover();
            } catch {}
            active.remove();
        }
        active = null;
    }

    function burst(host, calm, message = '부탁 해결!') {
        clear();
        const layer = document.createElement('div');
        layer.className = 'celebration';
        layer.setAttribute('role', 'status');
        layer.setAttribute('aria-label', message);
        const badge = document.createElement('strong');
        badge.textContent = '✦ ' + message + ' ✦';
        layer.append(badge);
        const reduced = calm || motion?.matches;
        if (!reduced)
            for (let i = 0; i < 84; i++) {
                const p = document.createElement('i'),
                    angle = i * Math.PI * 2 / 28,
                    dist = 130 + (i % 9) * 33;
                p.style.cssText = `--x:${Math.cos(angle)*dist}px;--y:${Math.sin(angle)*dist}px;--r:${i*47}deg;--delay:${Math.floor(i/28)*.16}s;background:${['#f4c65c','#73c898','#f19ca9','#9cbce9','#cfb0e7','#fff2b6'][i%6]};left:${[27,50,74][Math.floor(i/28)]}%;top:${[50,38,50][Math.floor(i/28)]}%`;
                layer.append(p);
            }
        host.append(layer);
        if (typeof layer.showPopover === 'function') {
            layer.setAttribute('popover', 'manual');
            layer.showPopover();
        }
        active = layer;
        timer = setTimeout(clear, reduced ? 1500 : 2200);
    }

    function festival(host = document.body, calm = false) {
        clear();
        if (calm || motion?.matches || document.hidden) return {
            cancel: clear
        };
        const layer = document.createElement('div'),
            canvas = document.createElement('canvas');
        layer.className = 'festival-particles';
        layer.setAttribute('aria-hidden', 'true');
        layer.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;max-width:none;max-height:none;margin:0;padding:0;border:0;background:transparent;overflow:hidden;pointer-events:none;z-index:2147483000;';
        canvas.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none;';
        layer.append(canvas);
        host.append(layer);
        active = layer;
        if (typeof layer.showPopover === 'function') try {
            layer.setAttribute('popover', 'manual');
            layer.showPopover();
        } catch {}
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            clear();
            return {
                cancel: clear
            };
        }
        let width = 1,
            height = 1;

        function resize() {
            const rect = layer.getBoundingClientRect();
            width = Math.max(1, rect.width || innerWidth);
            height = Math.max(1, rect.height || innerHeight);
            const ratio = Math.min(devicePixelRatio || 1, 1.25, 1600 / width, 1200 / height);
            canvas.width = Math.max(1, Math.round(width * ratio));
            canvas.height = Math.max(1, Math.round(height * ratio));
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        }
        resize();
        window.addEventListener('resize', resize);
        cleanup = () => window.removeEventListener('resize', resize);
        const colors = ['#ffe29a', '#a7e4c4', '#efb4c6', '#bbd9f0', '#d6bff0'],
            confetti = Array.from({
                length: 72
            }, (_, i) => ({
                x: (i * .61803398875) % 1,
                y: -(i % 11) * .035,
                vx: Math.sin(i * 2.4) * 34,
                vy: 90 + i % 7 * 16,
                w: 4 + i % 4,
                h: 8 + i % 5,
                spin: i * .7,
                color: colors[i % colors.length]
            }));
        const fireworks = [{
                x: .27,
                y: .31,
                at: .1,
                color: colors[0]
            }, {
                x: .73,
                y: .25,
                at: .68,
                color: colors[1]
            }, {
                x: .5,
                y: .18,
                at: 1.18,
                color: colors[3]
            }],
            started = performance.now();

        function draw(now) {
            if (active !== layer) return;
            if (document.hidden || motion?.matches) {
                clear();
                return;
            }
            const elapsed = (now - started) / 1000;
            if (elapsed >= 3) {
                clear();
                return;
            }
            ctx.clearRect(0, 0, width, height);
            const fade = Math.min(1, (3 - elapsed) / .6);
            for (const p of confetti) {
                const x = p.x * width + p.vx * elapsed + Math.sin(elapsed * 2 + p.spin) * 12,
                    y = p.y * height + p.vy * elapsed;
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(p.spin + elapsed * (p.vx < 0 ? -1 : 1));
                ctx.globalAlpha = fade * .9;
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            }
            for (const fire of fireworks) {
                const age = elapsed - fire.at;
                if (age < 0 || age > 1.75) continue;
                const opacity = Math.min(1, age / .12) * (1 - age / 1.75) * fade,
                    cx = width * fire.x,
                    cy = height * fire.y;
                ctx.strokeStyle = fire.color;
                ctx.fillStyle = fire.color;
                ctx.lineWidth = 1.8;
                ctx.globalAlpha = opacity;
                for (let k = 0; k < 34; k++) {
                    const a = k * Math.PI * 2 / 34,
                        speed = (95 + k % 5 * 13) * Math.min(1, width / 1000),
                        travel = speed * age * .8,
                        x = cx + Math.cos(a) * travel,
                        y = cy + Math.sin(a) * travel + 25 * age * age;
                    ctx.beginPath();
                    ctx.moveTo(x - Math.cos(a) * 7 * (1 - age / 1.75), y - Math.sin(a) * 7 * (1 - age / 1.75));
                    ctx.lineTo(x, y);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.globalAlpha = 1;
            animation = requestAnimationFrame(draw);
        }
        animation = requestAnimationFrame(draw);
        timer = setTimeout(() => {
            if (active === layer) clear();
        }, 3120);
        return {
            cancel: () => {
                if (active === layer) clear();
            }
        };
    }
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) clear();
    });
    const reduce = e => {
        if (e.matches) clear();
    };
    if (motion?.addEventListener) motion.addEventListener('change', reduce);
    else motion?.addListener?.(reduce);
    window.IslandCelebrate = {
        burst,
        festival,
        clear
    };
})();