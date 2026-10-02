import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Okno aplikacji odchylone do tyłu, które prostuje się w miarę przewijania.
 *
 * Parametry zdjęte z fotohub.app i przestrojone pod niższe okno: tam pochylenie
 * wynosi 15° przy perspektywie ok. 1860 px i osi obrotu na górnej krawędzi.
 * Oś na GÓRZE jest kluczowa - górna krawędź zostaje w miejscu pod nagłówkiem, a do
 * tyłu ucieka dół; przy osi w środku okno „podskakuje" w trakcie przewijania.
 *
 * Kąt i skala idą prosto do zmiennych CSS elementu, bez stanu Reacta: przewijanie
 * przerysowywałoby całe Hero 60 razy na sekundę, a tak dotyka jednego `transform`.
 */
export function Stage3D({ children }: { children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            el.style.setProperty('--tilt', '0deg');
            el.style.setProperty('--lift', '1');
            return;
        }

        let raf = 0;
        const update = () => {
            raf = 0;
            const rect = el.getBoundingClientRect();
            const vh = window.innerHeight;
            // 0 = górna krawędź okna w dolnej ćwierci ekranu, 1 = w górnej trzeciej.
            const p = Math.min(1, Math.max(0, (vh * 0.78 - rect.top) / (vh * 0.5)));
            const eased = 1 - Math.pow(1 - p, 3);
            const max = window.innerWidth < 768 ? 10 : 17;
            el.style.setProperty('--tilt', `${(max * (1 - eased)).toFixed(2)}deg`);
            el.style.setProperty('--lift', (0.93 + 0.07 * eased).toFixed(4));
        };
        const onScroll = () => {
            if (!raf) raf = requestAnimationFrame(update);
        };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, []);

    return (
        <div className="relative [perspective:1900px]">
            {/* Poświata: złoto z logo, rozlane pod oknem. To ona robi „głębię" - okno
                nie stoi na tle, tylko nad światłem, które rzuca. */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-[6%] top-[8%] bottom-[-6%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(220_174_92/0.30),rgb(220_174_92/0.10)_55%,transparent)] blur-3xl"
            />
            <div
                ref={ref}
                style={{ transform: 'rotateX(var(--tilt, 17deg)) scale(var(--lift, 0.93))' }}
                className="relative origin-top will-change-transform [transform-style:preserve-3d]"
            >
                {children}
            </div>
        </div>
    );
}

/**
 * Ramka urządzenia: gruba, ciemna oprawa z jaśniejszą krawędzią u góry, jak tafla
 * szkła oświetlona z góry. Odblask przesuwający się po górnej krawędzi to jedyny
 * ruch na samej ramce - przypomina światło lampy na świeżej powłoce.
 */
export function DeviceFrame({ children }: { children: ReactNode }) {
    return (
        <div className="relative rounded-[18px] bg-[linear-gradient(180deg,#1c1c20,#0d0d10)] p-[7px] shadow-[0_0_0_1px_rgb(255_255_255/0.10),0_1px_0_0_rgb(255_255_255/0.14)_inset,0_40px_80px_-20px_rgb(0_0_0/0.85),0_80px_160px_-40px_rgb(0_0_0/0.9)] sm:rounded-[22px] sm:p-[10px]">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-[8%] top-0 h-px animate-sheen bg-[linear-gradient(90deg,transparent,rgb(246_239_210/0.9),transparent)] bg-[length:50%_100%] bg-no-repeat"
            />
            <div className="relative overflow-hidden rounded-[12px] bg-[#0b0b0d] shadow-[0_0_0_1px_rgb(0_0_0/0.6)] sm:rounded-[14px]">
                {children}
            </div>
        </div>
    );
}
