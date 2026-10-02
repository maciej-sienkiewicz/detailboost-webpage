import { useEffect, useId, useState } from 'react';

const LINKS = ['Funkcje', 'Cennik', 'Integracje', 'Kontakt'] as const;

/**
 * Pasek ma trzy strefy w siatce 1fr / auto / 1fr, a nie flex z `justify-between`.
 * Przy flexie środek ląduje w połowie WOLNEGO miejsca, więc linki uciekają w bok
 * o różnicę szerokości logo i przycisków. Siatka trzyma je na osi strony -
 * tej samej, na której stoi nagłówek i okno aplikacji.
 *
 * Nad samą górą strony pasek jest przezroczysty i leży na ruchomym tle; tło
 * z rozmyciem i linia pod spodem pojawiają się dopiero po przewinięciu, gdy
 * pod paskiem zaczyna przesuwać się treść.
 *
 * Na telefonie menu otwiera słowo „Menu", nie hamburger: strona nie używa ikon.
 */
export function Navbar() {
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const panelId = useId();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
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
        <header
            className={`sticky top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-300 ${
                solid ? 'border-line bg-void/75 backdrop-blur-xl backdrop-saturate-150' : 'border-transparent bg-transparent'
            }`}
        >
            <nav
                aria-label="Główna"
                className="mx-auto grid h-16 max-w-[100rem] grid-cols-[1fr_auto] items-center px-5 sm:px-8 lg:grid-cols-[1fr_auto_1fr] lg:px-12"
            >
                <a href="#" className="justify-self-start text-[1.0625rem] font-[680] tracking-[-0.04em] text-paper">
                    DetailBoost
                </a>

                <ul className="hidden items-center gap-9 lg:flex">
                    {LINKS.map((label) => (
                        <li key={label}>
                            <a
                                href="#"
                                className="text-[0.8125rem] font-[450] tracking-[-0.01em] text-mute transition-colors duration-150 hover:text-paper"
                            >
                                {label}
                            </a>
                        </li>
                    ))}
                </ul>

                <div className="flex items-center gap-2 justify-self-end sm:gap-3">
                    <a
                        href="#"
                        className="hidden h-9 items-center rounded-[3px] border border-line-strong px-3.5 text-[0.8125rem] font-medium text-paper transition-colors duration-150 hover:border-paper/40 hover:bg-white/[0.04] lg:inline-flex"
                    >
                        Zaloguj
                    </a>
                    <a
                        href="#"
                        className="inline-flex h-9 items-center rounded-[3px] bg-paper px-4 text-[0.8125rem] font-medium tracking-[-0.01em] whitespace-nowrap text-void transition-colors duration-150 hover:bg-gold-50"
                    >
                        {/* Poniżej 400 px pełna etykieta wypycha „Menu" poza ekran; pełną
                            obietnicę i tak niesie przycisk na całą szerokość tuż pod paskiem. */}
                        Rozpocznij<span className="max-[399px]:hidden">&nbsp;za darmo</span>
                    </a>
                    <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={panelId}
                        onClick={() => setOpen((v) => !v)}
                        className="inline-flex h-9 w-[4.25rem] items-center justify-center rounded-[3px] border border-line-strong text-[0.8125rem] font-medium text-paper transition-colors duration-150 hover:border-paper/40 lg:hidden"
                    >
                        {open ? 'Zamknij' : 'Menu'}
                    </button>
                </div>
            </nav>

            <div id={panelId} hidden={!open} className="border-t border-line lg:hidden">
                <ul className="mx-auto max-w-[100rem] px-5 sm:px-8">
                    {[...LINKS, 'Zaloguj'].map((label) => (
                        <li key={label} className="border-b border-line last:border-b-0">
                            <a
                                href="#"
                                onClick={() => setOpen(false)}
                                className={`flex h-14 items-center text-[1.0625rem] font-[520] tracking-[-0.02em] ${
                                    label === 'Zaloguj' ? 'text-mute' : 'text-paper'
                                }`}
                            >
                                {label}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </header>
    );
}
