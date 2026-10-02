import { useEffect, useRef } from 'react';

/**
 * Ruchome tło: siatka kropek, przez którą przechodzą wolne fale światła.
 *
 * Kropki stoją w miejscu - rusza się tylko ich jasność. Pole przesuwających się
 * cząstek męczy oko i konkuruje z oknem aplikacji; stała siatka z wędrującą
 * poświatą czyta się jak materiał (tkanina, mikrofibra, lakier pod lampą),
 * a nie jak animacja, na którą trzeba patrzeć.
 *
 * Koszty pilnowane wprost:
 *  - 30 kl./s zamiast 60 - przy fali o okresie kilkunastu sekund różnicy nie widać,
 *    a procesor telefonu dostaje połowę roboty;
 *  - rysowanie staje, gdy tło jest poza ekranem albo karta jest w tle;
 *  - `prefers-reduced-motion` dostaje jedną, nieruchomą klatkę.
 */
export function DotField({ className = '' }: { className?: string }) {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const GAP = 22;
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
            draw(performance.now());
        };

        const draw = (now: number) => {
            const t = (now - t0) / 1000;
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

            for (let row = 0; row < rows; row++) {
                const y = row * GAP + (GAP / 2);
                for (let col = 0; col < cols; col++) {
                    const x = col * GAP + (GAP / 2);
                    const s = seeds[row * cols + col] ?? 0;
                    const d1 = Math.hypot(x - l1x, y - l1y) / r1;
                    const d2 = Math.hypot(x - l2x, y - l2y) / r2;
                    const light = Math.exp(-d1 * d1) + 0.8 * Math.exp(-d2 * d2);
                    // Pierścień fali: jasność rośnie na obwodzie rozchodzącego się koła.
                    const wave = 0.5 + 0.5 * Math.sin(Math.hypot(x - cx, y - h * 0.45) * 0.018 - t * 0.9);
                    const twinkle = 0.75 + 0.25 * Math.sin(t * (0.6 + s * 1.4) + s * 40);
                    const a = Math.min(0.55, 0.035 + light * (0.22 + 0.18 * wave) * twinkle);
                    if (a < 0.03) continue;
                    // Co dziewiąta kropka niesie złoto - tylko tam, gdzie pada światło.
                    const gold = s > 0.89 && light > 0.25;
                    ctx.fillStyle = gold ? `rgba(236,208,143,${a * 1.25})` : `rgba(244,244,242,${a})`;
                    const r = gold ? 1.15 : 0.95;
                    ctx.fillRect(x - r, y - r, r * 2, r * 2);
                }
            }
        };

        const loop = (now: number) => {
            raf = requestAnimationFrame(loop);
            if (!visible || document.hidden) return;
            if (now - last < 1000 / 30) return;
            last = now;
            draw(now);
        };

        const ro = new ResizeObserver(resize);
        ro.observe(canvas);
        const io = new IntersectionObserver(([entry]) => {
            visible = entry?.isIntersecting ?? true;
        });
        io.observe(canvas);
        resize();
        if (!reduced) raf = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            io.disconnect();
        };
    }, []);

    return <canvas ref={ref} aria-hidden className={`pointer-events-none block h-full w-full ${className}`} />;
}
