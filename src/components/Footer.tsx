import { DEMO_URL, LOGIN_URL, SIGNUP_URL } from '../site';
import { OfferTerms } from './Hero';
import { Wordmark } from './Navbar';
import { btnPrimary, btnSecondary, sectionTitle } from './ui';

/** Dane spółki z KRS - stopka strony sp. z o.o. musi je podawać (art. 206 KSH). */
const COMPANY = {
    name: 'M&M SOLUTIONS sp. z o.o.',
    address: ['ul. Poznańska 119', '60-185 Skórzewo'],
    registry: [
        ['KRS', '0001267442'],
        ['NIP', '7773476300'],
        ['REGON', '545750800'],
        ['Kapitał zakładowy', '40 000 zł'],
    ],
} as const;

export function Footer() {
    return (
        <footer id="kontakt" className="scroll-mt-24 border-t border-white/[0.06]">
            <div className="mx-auto max-w-[calc(80rem+6rem)] px-5 sm:px-8 lg:px-12">
                <div className="flex flex-col gap-8 py-20 sm:py-24 lg:flex-row lg:items-end lg:justify-between">
                    <h2 className={`max-w-[46rem] ${sectionTitle}`}>
                        Przyjmij pierwsze auto w DetailBoost jeszcze w tym tygodniu<span className="text-gold-400">.</span>
                    </h2>
                    <div className="flex flex-col gap-3 lg:items-end">
                        <div className="flex flex-col gap-2.5 sm:flex-row">
                            <a href={SIGNUP_URL} className={btnPrimary}>
                                Wypróbuj 3 miesiące za darmo
                            </a>
                            <a href={DEMO_URL} className={btnSecondary}>
                                Konto demo bez rejestracji
                            </a>
                        </div>
                        <OfferTerms />
                    </div>
                </div>

                <div className="grid gap-10 border-t border-white/[0.06] py-12 font-ui text-[0.8125rem] leading-relaxed text-dim sm:grid-cols-2 lg:grid-cols-12">
                    <div className="lg:col-span-4">
                        <Wordmark />
                        <p className="mt-3 max-w-[18rem]">System dla studiów auto detailingu.</p>
                    </div>
                    <div className="lg:col-span-4">
                        <p className="text-white/80">{COMPANY.name}</p>
                        {COMPANY.address.map((line) => (
                            <p key={line}>{line}</p>
                        ))}
                    </div>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 lg:col-span-3">
                        {COMPANY.registry.map(([label, value]) => (
                            <div key={label} className="contents">
                                <dt>{label}</dt>
                                <dd className="font-mono text-white/70 tabular-nums">{value}</dd>
                            </div>
                        ))}
                    </dl>
                    <nav aria-label="Aplikacja" className="flex flex-col gap-1 lg:col-span-1 lg:items-end">
                        <a href={LOGIN_URL} className="transition-colors hover:text-white">
                            Zaloguj
                        </a>
                        <a href={SIGNUP_URL} className="whitespace-nowrap transition-colors hover:text-white">
                            Załóż konto
                        </a>
                    </nav>
                </div>
                <p className="border-t border-white/[0.06] py-6 font-ui text-[0.75rem] text-dim/80">
                    © {new Date().getFullYear()} {COMPANY.name}
                </p>
            </div>
        </footer>
    );
}
