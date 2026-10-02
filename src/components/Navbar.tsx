import { useEffect, useId, useState } from 'react';

const LINKS = ['Funkcje', 'Cennik', 'Integracje', 'Kontakt'] as const;

/**
 * Pasek ma trzy strefy w siatce 1fr / auto / 1fr, a nie flex z `justify-between`.
 * Przy flexie środek ląduje w połowie WOLNEGO miejsca, więc linki uciekają w bok
 * o różnicę szerokości logo i przycisków. Siatka trzyma je na osi strony -
 * tej samej, na której stoi nagłówek i okno aplikacji.
 *
 * Na telefonie menu otwiera słowo „Menu", nie hamburger: strona nie używa ikon.
 * Rozwija się pod paskiem i przesuwa treść, więc nie blokuje przewijania tła.
 */
export function Navbar() {
    const [open, setOpen] = useState(false);
    const panelId = useId();

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

    return (
        <header className="sticky top-0 z-50 border-b border-rule bg-paper/85 backdrop-blur-md backdrop-saturate-150">
            <nav
                aria-label="Główna"
                className="mx-auto grid h-16 max-w-[100rem] grid-cols-[1fr_auto] items-center px-5 sm:px-8 lg:grid-cols-[1fr_auto_1fr] lg:px-12"
            >
                <a
                    href="#"
                    className="justify-self-start text-[1.0625rem] font-[750] tracking-[-0.035em] text-ink"
                >
                    DetailBoost
                </a>

                <ul className="hidden items-center gap-9 lg:flex">
                    {LINKS.map((label) => (
                        <li key={label}>
                            <a
                                href="#"
                                className="text-[0.8125rem] font-medium tracking-[-0.005em] text-graphite transition-colors duration-150 hover:text-ink"
                            >
                                {label}
                            </a>
                        </li>
                    ))}
                </ul>

                <div className="flex items-center gap-2 justify-self-end sm:gap-3">
                    <a
                        href="#"
                        className="hidden h-9 items-center rounded-[2px] border border-rule px-3.5 text-[0.8125rem] font-medium text-ink transition-colors duration-150 hover:border-ink lg:inline-flex"
                    >
                        Zaloguj
                    </a>
                    <a
                        href="#"
                        className="inline-flex h-9 items-center rounded-[2px] bg-ink px-4 text-[0.8125rem] font-medium tracking-[-0.005em] whitespace-nowrap text-paper transition-colors duration-150 hover:bg-graphite"
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
                        className="inline-flex h-9 w-[4.25rem] items-center justify-center rounded-[2px] border border-rule text-[0.8125rem] font-medium text-ink transition-colors duration-150 hover:border-ink lg:hidden"
                    >
                        {open ? 'Zamknij' : 'Menu'}
                    </button>
                </div>
            </nav>

            <div id={panelId} hidden={!open} className="border-t border-rule lg:hidden">
                <ul className="mx-auto max-w-[100rem] px-5 sm:px-8">
                    {LINKS.map((label) => (
                        <li key={label} className="border-b border-rule">
                            <a
                                href="#"
                                onClick={() => setOpen(false)}
                                className="flex h-14 items-center text-[1.0625rem] font-[560] tracking-[-0.02em] text-ink"
                            >
                                {label}
                            </a>
                        </li>
                    ))}
                    <li>
                        <a
                            href="#"
                            onClick={() => setOpen(false)}
                            className="flex h-14 items-center text-[1.0625rem] font-[560] tracking-[-0.02em] text-graphite"
                        >
                            Zaloguj
                        </a>
                    </li>
                </ul>
            </div>
        </header>
    );
}
