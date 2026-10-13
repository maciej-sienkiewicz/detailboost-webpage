import { useEffect, useId, useState } from 'react';
import { LOGIN_URL } from '../site';
import { CloseIcon, MenuIcon, UserIcon } from './icons';

/** Kotwice sekcji. „Start" to góra strony - jak „Home" w szablonie. */
export const NAV = [
    ['Start', '#top'],
    ['Funkcje', '#funkcje'],
    ['KSeF', '#ksef'],
    ['Cennik', '#cennik'],
    ['Kontakt', '#kontakt'],
] as const;

/** Znak: ciemny kwadrat z „D" i nazwa obok - jak sygnet w lewym rogu szablonu. */
export function Logo({ className = '' }: { className?: string }) {
    return (
        <a href="#top" className={`inline-flex items-center gap-2.5 text-ink ${className}`} aria-label="DetailBoost, początek strony">
            <span aria-hidden className="grid size-9 place-items-center rounded-full bg-ink text-[1.05rem] leading-none font-bold text-white">
                D
            </span>
            <span className="text-[1.0625rem] font-semibold tracking-[-0.01em]">DetailBoost</span>
        </a>
    );
}

/**
 * Pasek z szablonu: biały, logo po lewej, linki po prawej, na końcu ikona (tam lupa,
 * u nas logowanie do aplikacji). Bieżąca sekcja jest szara jak „Home" w szablonie -
 * śledzi ją IntersectionObserver. Na telefonie linki chowają się pod ikonę menu.
 */
export function Header() {
    const [active, setActive] = useState<string>('#top');
    const [open, setOpen] = useState(false);
    const panelId = useId();

    useEffect(() => {
        const sections = NAV.map(([, href]) => document.querySelector(href)).filter((el): el is Element => !!el);
        const visible = new Map<string, number>();
        const observer = new IntersectionObserver(
            (entries) => {
                for (const e of entries) visible.set(`#${e.target.id}`, e.isIntersecting ? e.intersectionRatio : 0);
                let best = '#top';
                let ratio = 0;
                for (const [href, r] of visible) {
                    if (r > ratio) {
                        best = href;
                        ratio = r;
                    }
                }
                if (ratio > 0) setActive(best);
            },
            { threshold: [0, 0.2, 0.4, 0.6], rootMargin: '-80px 0px -35% 0px' },
        );
        sections.forEach((s) => observer.observe(s));
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const link = (href: string) =>
        `text-[0.9375rem] transition-colors duration-150 ${active === href ? 'text-muted' : 'text-ink/85 hover:text-accent'}`;

    return (
        <header className="sticky top-0 z-40 border-b border-transparent bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
            <div className="mx-auto flex h-20 max-w-[68rem] items-center justify-between px-5 sm:px-8 lg:h-24">
                <Logo />

                <nav aria-label="Sekcje strony" className="hidden items-center gap-9 md:flex">
                    {NAV.map(([label, href]) => (
                        <a key={href} href={href} className={link(href)} aria-current={active === href ? 'true' : undefined}>
                            {label}
                        </a>
                    ))}
                    <a href={LOGIN_URL} className="text-ink/85 transition-colors hover:text-accent" aria-label="Zaloguj do aplikacji" title="Zaloguj">
                        <UserIcon className="size-[1.1rem]" />
                    </a>
                </nav>

                <button
                    type="button"
                    className="-mr-2 grid size-10 place-items-center text-ink md:hidden"
                    aria-expanded={open}
                    aria-controls={panelId}
                    aria-label={open ? 'Zamknij menu' : 'Otwórz menu'}
                    onClick={() => setOpen((v) => !v)}
                >
                    {open ? <CloseIcon className="size-6" /> : <MenuIcon className="size-6" />}
                </button>
            </div>

            {open && (
                <nav id={panelId} aria-label="Sekcje strony" className="border-t border-line bg-white px-5 pb-5 sm:px-8 md:hidden">
                    <ul className="flex flex-col">
                        {NAV.map(([label, href]) => (
                            <li key={href}>
                                <a href={href} onClick={() => setOpen(false)} className={`block border-b border-line py-3.5 ${link(href)}`}>
                                    {label}
                                </a>
                            </li>
                        ))}
                        <li>
                            <a href={LOGIN_URL} className="flex items-center gap-2 py-3.5 text-[0.9375rem] text-ink/85">
                                <UserIcon className="size-[1.1rem]" />
                                Zaloguj
                            </a>
                        </li>
                    </ul>
                </nav>
            )}
        </header>
    );
}
