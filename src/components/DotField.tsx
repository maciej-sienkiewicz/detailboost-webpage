import { useEffect, useRef } from 'react';

/**
 * Ruchome tło: siatka kropek, która żyje na trzech warstwach.
 *
 *  1. Poświata - dwa źródła światła krążą powoli po elipsach, kropki w ich zasięgu
 *     jaśnieją i migoczą. To „materiał" tła: lakier pod lampą, nie animacja.
 *  2. Fala - co kilka sekund spod okna aplikacji rozchodzi się pierścień: kropki na
 *     jego obwodzie rosną, jaśnieją i odsuwają się o parę pikseli, jak woda po
 *     kropli. Kliknięcie w dowolnym miejscu puszcza taką falę spod palca.
 *  3. Kursor - kropki rozstępują się przed nim i rozjaśniają, złoto pojawia się
 *     tuż przy nim. Gdy kursor stoi, siła gaśnie, więc tło nie „przykleja się"
 *     do myszy.
 *
 * Siatka zostaje siatką: przesunięcia to kilka pikseli i zawsze wracają na miejsce.
 *
 * Koszty pilnowane wprost:
 *  - 60 kl./s przy myszy, 30 kl./s na ekranach dotykowych - tam nie ma kursora,
 *    a fala o tym tempie wygląda tak samo, procesor telefonu ma połowę roboty;
 *  - rysowanie staje, gdy tło jest poza ekranem albo karta jest w tle;
 *  - `prefers-reduced-motion` dostaje jedną, nieruchomą klatkę, bez fal i kursora.
 */
export function DotField({ className = '' }: { className?: string }) {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const fine = window.matchMedia('(pointer: fine)').matches;
        const FRAME = 1000 / (fine ? 60 : 30);
        const GAP = 22;
        /** Prędkość czoła fali (px/s) i grubość pierścienia (px). */
        const SPEED = 300;
        const RING = 64;
        /** Co ile sekund fala spod okna. */
        const EVERY = 6.5;
        /** Zasięg kursora (px). */
        const REACH = 150;
        let w = 0;
        let h = 0;
        let dpr = 1;
        let raf = 0;
        let visible = true;
        let last = 0;
        const t0 = performance.now();

        // Stałe „ziarno" każdej kropki: część z nich ma złoty odcień i własne tempo
        // migotania. Liczone raz na rozmiar, nie w każdej klatce.
        let seeds: Float32Array = new Float32Array(0);

        const ripples: { x: number; y: number; at: number; power: number }[] = [];
        let nextRipple = 1.4;
        // Kursor we współrzędnych ekranu (płótno przewija się ze stroną, więc
        // na płótno przeliczamy w każdej klatce) i wygładzony ślad na płótnie.
        const pointer = { cx: -1e4, cy: -1e4, x: -1e4, y: -1e4, energy: 0, moved: -1e4 };

        const now = () => (performance.now() - t0) / 1000;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = rect.width;
            h = rect.height;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const cols = Math.ceil(w / GAP) + 1;
            const rows = Math.ceil(h / GAP) + 1;
            seeds = new Float32Array(cols * rows);
            for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
            draw(performance.now(), 0);
        };

        const draw = (stamp: number, dt: number) => {
            const t = (stamp - t0) / 1000;
            ctx.clearRect(0, 0, w, h);
            const cols = Math.ceil(w / GAP) + 1;
            const rows = Math.ceil(h / GAP) + 1;
            const cx = w / 2;
            // Dwa źródła światła krążą powoli po elipsach - fala nigdy nie wraca
            // w to samo miejsce w tym samym kształcie.
            const l1x = cx + Math.sin(t * 0.11) * w * 0.32;
            const l1y = h * 0.34 + Math.cos(t * 0.09) * h * 0.18;
            const l2x = cx + Math.cos(t * 0.07 + 2) * w * 0.38;
            const l2y = h * 0.62 + Math.sin(t * 0.13 + 1) * h * 0.14;
            const r1 = Math.max(w, h) * 0.26;
            const r2 = Math.max(w, h) * 0.22;

            // Fale: automatyczna spod okna aplikacji, gasnąca z odległością.
            const far = Math.hypot(w, h) * 0.75;
            if (dt > 0 && t >= nextRipple) {
                ripples.push({ x: cx, y: h * 0.5, at: t, power: 1 });
                nextRipple = t + EVERY;
            }
            for (let i = ripples.length - 1; i >= 0; i--) {
                if ((t - ripples[i]!.at) * SPEED > far + RING) ripples.splice(i, 1);
            }
            const live = ripples.map((r) => {
                const front = (t - r.at) * SPEED;
                return { x: r.x, y: r.y, front, power: r.power * Math.max(0, 1 - front / far) };
            });

            // Kursor: ślad dogania kursor z opóźnieniem, siła gaśnie, gdy mysz stoi.
            const rect = canvas.getBoundingClientRect();
            const px = pointer.cx - rect.left;
            const py = pointer.cy - rect.top;
            const follow = 1 - Math.exp(-dt * 10);
            pointer.x += (px - pointer.x) * follow;
            pointer.y += (py - pointer.y) * follow;
            const target = t - pointer.moved < 1.2 ? 1 : 0;
            pointer.energy += (target - pointer.energy) * (1 - Math.exp(-dt * (target ? 6 : 1.5)));
            const energy = pointer.energy;

            for (let row = 0; row < rows; row++) {
                const y = row * GAP + (GAP / 2);
                for (let col = 0; col < cols; col++) {
                    const x = col * GAP + (GAP / 2);
                    const s = seeds[row * cols + col] ?? 0;
                    const d1 = Math.hypot(x - l1x, y - l1y) / r1;
                    const d2 = Math.hypot(x - l2x, y - l2y) / r2;
                    const light = Math.exp(-d1 * d1) + 0.8 * Math.exp(-d2 * d2);
                    const twinkle = 0.75 + 0.25 * Math.sin(t * (0.6 + s * 1.4) + s * 40);

                    let boost = 0;
                    let ox = 0;
                    let oy = 0;
                    for (const r of live) {
                        if (r.power <= 0) continue;
                        const dx = x - r.x;
                        const dy = y - r.y;
                        const dist = Math.hypot(dx, dy) || 1;
                        const k = (dist - r.front) / RING;
                        if (k < -1.6 || k > 1.6) continue;
                        const g = Math.exp(-k * k * 2.2) * r.power * 0.8;
                        boost += g;
                        // Odsunięcie wzdłuż promienia: grzbiet fali pcha kropki na zewnątrz.
                        ox += (dx / dist) * g * 5;
                        oy += (dy / dist) * g * 5;
                    }
                    if (energy > 0.01) {
                        const dx = x - pointer.x;
                        const dy = y - pointer.y;
                        const dist = Math.hypot(dx, dy) || 1;
                        if (dist < REACH) {
                            const f = 1 - dist / REACH;
                            const g = f * f * energy;
                            boost += g * 1.1;
                            ox += (dx / dist) * g * 16;
                            oy += (dy / dist) * g * 16;
                        }
                    }

                    const a = Math.min(0.9, 0.035 + light * 0.3 * twinkle + boost * 0.5);
                    if (a < 0.03) continue;
                    // Co dziewiąta kropka niesie złoto tam, gdzie pada światło; na grzbiecie
                    // fali i przy kursorze złota jest więcej.
                    const gold = (s > 0.89 && light > 0.25) || (s > 0.62 && boost > 0.45);
                    ctx.fillStyle = gold ? `rgba(236,208,143,${Math.min(1, a * 1.25)})` : `rgba(244,244,242,${a})`;
                    const size = (gold ? 1.15 : 0.95) + Math.min(1.3, boost * 1.1);
                    ctx.fillRect(x + ox - size, y + oy - size, size * 2, size * 2);
                }
            }
        };

        const loop = (stamp: number) => {
            raf = requestAnimationFrame(loop);
            if (!visible || document.hidden) {
                last = stamp;
                return;
            }
            if (stamp - last < FRAME - 1) return;
            const dt = Math.min(0.1, (stamp - last) / 1000);
            last = stamp;
            draw(stamp, dt);
        };

        const onMove = (e: PointerEvent) => {
            if (e.pointerType !== 'mouse') return;
            pointer.cx = e.clientX;
            pointer.cy = e.clientY;
            // Pierwszy ruch: ślad startuje od kursora, a nie wlatuje spoza ekranu.
            if (pointer.energy < 0.01) {
                const rect = canvas.getBoundingClientRect();
                pointer.x = e.clientX - rect.left;
                pointer.y = e.clientY - rect.top;
            }
            pointer.moved = now();
        };
        const onLeave = () => {
            pointer.moved = -1e4;
        };
        const onDown = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (x < 0 || y < 0 || x > w || y > h) return;
            ripples.push({ x, y, at: now(), power: 1.15 });
        };

        const ro = new ResizeObserver(resize);
        ro.observe(canvas);
        const io = new IntersectionObserver(([entry]) => {
            visible = entry?.isIntersecting ?? true;
        });
        io.observe(canvas);
        resize();
        if (!reduced) {
            raf = requestAnimationFrame(loop);
            window.addEventListener('pointermove', onMove, { passive: true });
            window.addEventListener('pointerdown', onDown, { passive: true });
            document.documentElement.addEventListener('pointerleave', onLeave);
        }

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerdown', onDown);
            document.documentElement.removeEventListener('pointerleave', onLeave);
            ro.disconnect();
            io.disconnect();
        };
    }, []);

    return <canvas ref={ref} aria-hidden className={`pointer-events-none block h-full w-full ${className}`} />;
}
