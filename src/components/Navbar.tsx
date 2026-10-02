import { useEffect, useId, useRef, useState } from 'react';

const LINKS = ['Funkcje', 'Cennik', 'Integracje', 'Kontakt'] as const;

/**
 * Pasek nawigacji według fotohub.app: Inter 14 px, miękkie narożniki (6 px przy
 * linkach, 8 px przy przyciskach), dwa białe przyciski, z których główny ma
 * jasną krawędź u góry i poświatę pod spodem - u nich pomarańczową, u nas złotą.
 *
 * Nad samą górą strony pasek jest przezroczysty i wyższy (py-4). Po przewinięciu
 * ściska się (py-2.5) i dostaje ciemny gradient z mocnym rozmyciem i cieniem
 * zamiast linii - krawędź robi cień, nie kreska. Pasek jest `fixed`, a miejsce
 * pod nim trzyma przekładka o wysokości rozłożonego paska: przy `sticky` zmiana
 * wysokości przesuwałaby całą stronę w trakcie przewijania.
 *
 * Nad paskiem biegnie 2-pikselowy pasek postępu przewijania. Szerokość idzie
 * prosto do stylu elementu, bez stanu Reacta.
 *
 * Na telefonie menu otwiera słowo „Menu", nie hamburger: strona nie używa ikon.
 */
export function Navbar() {
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const progress = useRef<HTMLDivElement>(null);
    const panelId = useId();

    useEffect(() => {
        let raf = 0;
        const update = () => {
            raf = 0;
            setScrolled(window.scrollY > 8);
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
            const bar = progress.current;
            if (bar) {
                bar.style.transform = `scaleX(${p})`;
                bar.style.opacity = p > 0.002 ? '1' : '0';
            }
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

    useEffect(() => {
        if (!open) return;
        const close = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        const reset = () => window.matchMedia('(min-width: 1024px)').matches && setOpen(false);
        window.addEventListener('keydown', close);
        window.addEventListener('resize', reset);
        return () => {
            window.removeEventListener('keydown', close);
            window.removeEventListener('resize', reset);
        };
    }, [open]);

    const solid = scrolled || open;

    return (
        <>
            <div
                ref={progress}
                aria-hidden
                className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] origin-left scale-x-0 bg-[linear-gradient(90deg,var(--color-gold-50)_0%,var(--color-gold-200)_45%,var(--color-gold-600)_100%)] opacity-0 transition-opacity duration-500"
            />
            {/* Przekładka = wysokość paska nad górą strony (50 px logo + 2 × 16 px). */}
            <div aria-hidden className="h-[82px]" />
            <header
                className={`fixed inset-x-0 top-[env(safe-area-inset-top,0px)] z-50 px-4 font-ui transition-all duration-300 sm:px-6 ${
                    solid
                        ? 'bg-gradient-to-b from-[rgb(10_10_11/0.95)] to-[rgb(10_10_11/0.75)] py-2.5 shadow-[0_8px_32px_-8px_rgb(0_0_0/0.5)] backdrop-blur-2xl max-md:from-[rgb(10_10_11/0.97)] max-md:to-[rgb(10_10_11/0.94)]'
                        : 'bg-transparent py-4'
                }`}
            >
                <nav aria-label="Główna" className="mx-auto flex max-w-[80rem] items-center justify-between gap-3 sm:gap-6">
                    <Wordmark />

                    <div className="flex items-center">
                        <ul className="hidden items-center gap-1.5 lg:flex">
                            {LINKS.map((label) => (
                                <li key={label}>
                                    <a
                                        href="#"
                                        className="inline-flex h-9 items-center justify-center rounded-md px-2.5 text-sm font-medium text-white/70 transition-colors duration-200 hover:text-white xl:px-4"
                                    >
                                        {label}
                                    </a>
                                </li>
                            ))}
                        </ul>

                        <span aria-hidden className="mx-5 hidden h-4 w-px bg-white/[0.1] xl:block" />

                        <div className="flex items-center gap-1.5 sm:gap-2 lg:ml-3 xl:ml-0">
                            <a
                                href="#"
                                className="hidden h-9 items-center justify-center rounded-lg bg-white px-4 text-sm font-medium whitespace-nowrap text-[#0a0908] transition-[background-color,transform] duration-200 hover:bg-white/90 active:translate-y-px lg:inline-flex"
                            >
                                Zaloguj
                            </a>
                            <a
                                href="#"
                                className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3.5 text-sm font-semibold sm:px-4 whitespace-nowrap text-[#0a0709] shadow-[inset_0_1px_0_0_rgb(255_255_255/0.6),0_10px_26px_-10px_rgb(220_174_92/0.75)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-gold-50 hover:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.6),0_12px_30px_-8px_rgb(220_174_92/0.9)] active:translate-y-px"
                            >
                                {/* Poniżej 400 px pełna etykieta wypycha „Menu" poza ekran; pełną
                                    obietnicę i tak niesie przycisk na całą szerokość pod paskiem. */}
                                Rozpocznij<span className="max-[399px]:hidden">&nbsp;za darmo</span>
                            </a>
                            <button
                                type="button"
                                aria-expanded={open}
                                aria-controls={panelId}
                                onClick={() => setOpen((v) => !v)}
                                className="inline-flex h-9 min-w-[4.25rem] items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.07] px-3 text-sm font-medium text-white/70 transition-all duration-200 hover:bg-white/[0.12] hover:text-white lg:hidden"
                            >
                                {open ? 'Zamknij' : 'Menu'}
                            </button>
                        </div>
                    </div>
                </nav>

                <div id={panelId} hidden={!open} className="mx-auto mt-3 max-w-[80rem] pb-2 lg:hidden">
                    <ul className="flex flex-col gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-2">
                        {[...LINKS, 'Zaloguj'].map((label) => (
                            <li key={label}>
                                <a
                                    href="#"
                                    onClick={() => setOpen(false)}
                                    className={`flex h-12 items-center rounded-lg px-3 text-[0.9375rem] font-medium transition-colors duration-200 hover:bg-white/[0.06] hover:text-white ${
                                        label === 'Zaloguj' ? 'text-white/60' : 'text-white/85'
                                    }`}
                                >
                                    {label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </header>
        </>
    );
}

/**
 * Znak słowny w układzie „FOTO HUB": pierwsze słowo duże i ciężkie, drugie małe
 * wersalikami, oparte o linię bazową pierwszego. Archivo rozszerzone (112%) daje
 * ten sam szeroki, miękki rysunek liter. Bez ikony - jak cała strona.
 */
function Wordmark() {
    return (
        <a
            href="#"
            aria-label="DetailBoost - strona główna"
            className="flex h-[50px] shrink-0 items-center text-white transition-opacity duration-200 hover:opacity-70"
        >
            <span aria-hidden className="flex items-baseline gap-[0.2rem] font-display leading-none">
                <span className="text-[1.3125rem] font-[850] tracking-[-0.045em] [font-stretch:112%] sm:text-[1.8125rem]">
                    DETAIL
                </span>
                <span className="text-[0.75rem] font-[800] tracking-[-0.02em] [font-stretch:108%] sm:text-[1.0625rem]">
                    BOOST
                </span>
            </span>
        </a>
    );
}
