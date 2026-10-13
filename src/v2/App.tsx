import type { ComponentType, ReactNode, SVGProps } from 'react';
import { BASIC_INCLUDES, BENEFITS, COMPANY, FULL_INCLUDES, KSEF_COSTS, KSEF_SALES } from '../content';
import { ADD_ONS, DEMO_URL, LOGIN_URL, OFFER_TERMS, PLANS, SIGNUP_URL, SMS_PACKAGES, net, perDay, zl } from '../site';
import { Header, Logo } from './Header';
import {
    BellIcon,
    CameraIcon,
    CheckIcon,
    ClockIcon,
    DotsIcon,
    FeatherIcon,
    GearsIcon,
    InboxIcon,
    LaptopIcon,
    MessageIcon,
    PhoneIcon,
    PowerIcon,
    ReceiptIcon,
    ShieldIcon,
    TabletIcon,
} from './icons';
import { HeroDevices, PhoneFrame } from './Devices';

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

const wrap = 'mx-auto max-w-[68rem] px-5 sm:px-8';

const btnPrimary =
    'inline-flex h-12 items-center justify-center gap-2.5 rounded-[4px] bg-accent px-6 text-[0.9375rem] font-medium whitespace-nowrap text-white transition-colors duration-150 hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

const btnLink =
    'inline-flex h-12 items-center gap-2.5 px-1 text-[0.9375rem] font-medium whitespace-nowrap text-ink transition-colors duration-150 hover:text-accent';

/** Nagłówek sekcji jak „Welcome to / GeneratePress": cienki szary nadpis nad grubym tytułem. */
function SectionHead({ kicker, title, id, children }: { kicker: string; title: string; id: string; children?: ReactNode }) {
    return (
        <div className="max-w-[40rem]">
            <p className="text-[1.375rem] leading-tight font-light text-muted">{kicker}</p>
            <h2 id={id} className="mt-1 text-[clamp(1.875rem,4vw,2.625rem)] leading-[1.15] font-bold tracking-[-0.02em] text-balance text-ink">
                {title}
            </h2>
            {children && <p className="mt-5 text-[1.0625rem] leading-[1.7] text-pretty">{children}</p>}
        </div>
    );
}

function OfferTerms({ className = '' }: { className?: string }) {
    return <p className={`text-[0.8125rem] text-muted ${className}`}>{OFFER_TERMS.join(', ')}</p>;
}

/* ─── Hero ────────────────────────────────────────────────────────────────── */

function Hero() {
    return (
        <section aria-labelledby="hero-title" className="relative overflow-hidden">
            {/* Ukośna szara płaszczyzna u dołu, na której stoi ilustracja - jak w szablonie. */}
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-[38%] bg-mist [clip-path:polygon(0_68%,100%_0,100%_100%,0_100%)]" />

            <div className={`${wrap} relative grid items-center gap-12 pt-10 pb-20 sm:pt-16 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-8 lg:pt-16 lg:pb-24`}>
                <div className="max-w-[31rem]">
                    <p className="text-[1.5rem] leading-tight font-light text-muted sm:text-[1.625rem]">Witaj w DetailBoost</p>
                    {/* Główne hasło: trzy krótkie zdania, każde w swoim wierszu. */}
                    <h1 id="hero-title" className="mt-2 text-[clamp(2.375rem,5.2vw,3.5rem)] leading-[1.06] font-bold tracking-[-0.03em] text-ink">
                        <span className="block">Cała firma.</span>
                        <span className="block">Jeden system.</span>
                        <span className="block text-accent">Pełna kontrola.</span>
                    </h1>
                    <p className="mt-6 text-[1.0625rem] leading-[1.7] text-pretty text-body">
                        System dla studiów auto detailingu. Kalendarz, przypomnienia SMS, protokoły przyjęcia,
                        faktury w KSeF i baza klientów w jednym miejscu.
                    </p>
                    <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-3">
                        <a href={SIGNUP_URL} className={btnPrimary}>
                            <PowerIcon className="size-[1.05rem]" />
                            Wypróbuj za darmo
                        </a>
                        <a href={DEMO_URL} className={btnLink}>
                            <DotsIcon className="size-[1.05rem]" />
                            Konto demo
                        </a>
                    </div>
                    <OfferTerms className="mt-5" />
                </div>

                <HeroDevices />
            </div>
        </section>
    );
}

/* ─── Trzy kolumny pod hero ──────────────────────────────────────────────── */

const PILLARS: { icon: IconType; title: string; text: string }[] = [
    {
        icon: FeatherIcon,
        title: 'Cyfrowa obsługa klienta, bez papierologii.',
        text: 'Protokół przyjęcia podpisany na tablecie, zdjęcia auta z telefonu, przypomnienia SMS i Karta Wizyty, którą klient otwiera u siebie.',
    },
    {
        icon: ShieldIcon,
        title: 'Klienci, realizacje, finanse i zespół. Jeden system.',
        text: 'Od zapytania przez rezerwację i wizytę po fakturę w KSeF. Do tego koszty, czas pracy zespołu i historia każdego klienta.',
    },
    {
        icon: GearsIcon,
        title: 'Zarządzaj firmą prościej. Kontroluj więcej.',
        text: 'Wszystko, co dziś leży w zeszycie, telefonie i kilku programach, w jednym miejscu. Cały zespół jest w cenie planu.',
    },
];

function Pillars() {
    return (
        <section aria-label="DetailBoost w skrócie" className="bg-mist">
            <div className={`${wrap} grid gap-12 pt-6 pb-24 sm:grid-cols-2 lg:grid-cols-3 lg:gap-16`}>
                {PILLARS.map(({ icon: Icon, title, text }) => (
                    <div key={title}>
                        <Icon className="size-10 text-ink" />
                        <h2 className="mt-6 text-[1.1875rem] leading-snug font-semibold tracking-[-0.01em] text-balance text-ink">{title}</h2>
                        <p className="mt-3 text-[1rem] leading-[1.7] text-pretty">{text}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

/* ─── Z każdego miejsca ──────────────────────────────────────────────────── */

const PLACES: { icon: IconType; title: string; text: string }[] = [
    { icon: LaptopIcon, title: 'Komputer w recepcji', text: 'Kalendarz, zapytania, poczta, faktury i koszty.' },
    { icon: TabletIcon, title: 'Tablet przy aucie', text: 'Przyjęcie pojazdu, zdjęcia i protokół podpisany przez klienta.' },
    { icon: PhoneIcon, title: 'Telefon poza studiem', text: 'Tablica i kalendarz, a do tego powiadomienia o tym, co ważne.' },
];

function Anywhere() {
    return (
        <section aria-labelledby="wszedzie-title" className="overflow-hidden bg-white">
            <div className={`${wrap} grid items-center gap-14 py-24 sm:py-28 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-10`}>
                <div>
                    <SectionHead kicker="Komputer, tablet, telefon" title="Pełna kontrola nad firmą. Z każdego miejsca." id="wszedzie-title">
                        DetailBoost działa w przeglądarce, bez instalowania. Te same dane widzisz w studiu i poza nim.
                    </SectionHead>
                    <ul className="mt-10 flex flex-col gap-7">
                        {PLACES.map(({ icon: Icon, title, text }) => (
                            <li key={title} className="flex gap-4">
                                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                                    <Icon className="size-5" />
                                </span>
                                <span>
                                    <span className="block text-[1rem] font-semibold text-ink">{title}</span>
                                    <span className="mt-0.5 block text-[0.9375rem] leading-[1.6]">{text}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="relative mx-auto text-[clamp(9px,2.6vw,15px)]">
                    <div aria-hidden className="absolute top-[12%] left-1/2 size-[24em] -translate-x-1/2 rounded-full bg-mist" />
                    <PhoneFrame
                        src="/v2/telefon-tablica.webp"
                        alt="Tablica DetailBoost na telefonie: wizyty w trakcie i najbliższe wizyty"
                        className="relative w-[17em] shadow-[0_2.5em_4em_-1.5em_rgb(31_35_40/0.45),inset_0_0_0_1px_rgb(255_255_255/0.14),inset_0_1px_0_rgb(255_255_255/0.22)]"
                    />
                </div>
            </div>
        </section>
    );
}

/* ─── Funkcje ────────────────────────────────────────────────────────────── */

/** Ikona do każdej karty, w kolejności z content.ts. */
const BENEFIT_ICONS: IconType[] = [InboxIcon, BellIcon, CameraIcon, MessageIcon, ReceiptIcon, ClockIcon];

function Features() {
    return (
        <section id="funkcje" aria-labelledby="funkcje-title" className="scroll-mt-24 bg-mist">
            <div className={`${wrap} py-24 sm:py-28`}>
                <SectionHead kicker="Funkcje" title="Mniej chaosu. Więcej kontroli nad biznesem." id="funkcje-title" />

                <ul className="mt-14 grid gap-x-12 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                    {BENEFITS.map((b, i) => {
                        const Icon = BENEFIT_ICONS[i] ?? CheckIcon;
                        return (
                            <li key={b.change} className="flex flex-col">
                                <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent">
                                    <Icon className="size-[1.375rem]" />
                                </span>
                                <h3 className="mt-5 text-[1.125rem] leading-snug font-semibold tracking-[-0.01em] text-balance text-ink">
                                    {b.change}
                                </h3>
                                <p className="mt-3 text-[0.9375rem] leading-[1.7] text-pretty">{b.how}</p>
                                <p className="mt-auto pt-5 text-[0.875rem] leading-[1.6] text-pretty text-muted">
                                    <span className="font-medium text-body">Dziś: </span>
                                    {b.today}
                                </p>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </section>
    );
}

/* ─── KSeF ───────────────────────────────────────────────────────────────── */

function Ksef() {
    return (
        <section id="ksef" aria-labelledby="ksef-title" className="relative scroll-mt-24 bg-white">
            <div className={`${wrap} grid gap-12 py-24 sm:py-28 lg:grid-cols-12 lg:gap-10`}>
                <div className="lg:col-span-5">
                    <SectionHead kicker="KSeF" title="Faktury bez przepisywania" id="ksef-title">
                        Faktura powstaje z wizyty, którą już masz w systemie, i sama idzie do KSeF. Faktury od
                        dostawców przychodzą z KSeF bez Twojego udziału.
                    </SectionHead>
                    <p className="mt-6 border-l-[3px] border-accent pl-4 text-[0.9375rem] leading-[1.6] text-ink">
                        Od 1 stycznia 2027 r. kończy się okres przejściowy bez kar za błędy w KSeF.
                    </p>
                    <p className="mt-6 text-[0.875rem] text-muted">
                        KSeF jest w planie FULL albo w module „Kontrola nad finansami” do planu BASIC.
                    </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:col-span-7">
                    <KsefCard title="Sprzedaż" items={KSEF_SALES} />
                    <KsefCard title="Koszty" items={KSEF_COSTS} />
                </div>
            </div>
        </section>
    );
}

function KsefCard({ title, items }: { title: string; items: readonly string[] }) {
    return (
        <div className="rounded-[6px] border border-line bg-white p-7 shadow-[0_1px_2px_rgb(31_35_40/0.04),0_12px_32px_-18px_rgb(31_35_40/0.16)]">
            <h3 className="text-[1.125rem] font-semibold text-ink">{title}</h3>
            <ul className="mt-5 flex flex-col gap-3.5">
                {items.map((item) => (
                    <li key={item} className="flex gap-3 text-[0.9375rem] leading-[1.55]">
                        <CheckIcon className="mt-[0.2em] size-[1.05rem] shrink-0 text-accent" />
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/* ─── Cennik ─────────────────────────────────────────────────────────────── */

function Pricing() {
    const allModules = PLANS.basic.grossCents + ADD_ONS.reduce((sum, a) => sum + a.grossCents, 0);
    return (
        <section id="cennik" aria-labelledby="cennik-title" className="scroll-mt-24 bg-mist">
            <div className={`${wrap} py-24 sm:py-28`}>
                <SectionHead kicker="Cennik" title="Pierwsze 3 miesiące za darmo" id="cennik-title">
                    Bez karty i bez umowy terminowej. W okresie próbnym przełączasz się na FULL bez opłat i sprawdzasz
                    wszystkie moduły na swoim studiu.
                </SectionHead>

                <div className="mt-14 grid gap-6 lg:grid-cols-2">
                    <Plan
                        name={PLANS.basic.name}
                        lead="Kalendarz, klienci i wizyty. Moduły dokładasz, kiedy ich potrzebujesz."
                        grossCents={PLANS.basic.grossCents}
                        includes={BASIC_INCLUDES}
                    />
                    <Plan
                        name={PLANS.full.name}
                        lead="Wszystkie moduły w jednej cenie."
                        grossCents={PLANS.full.grossCents}
                        includes={FULL_INCLUDES}
                        note={`Taniej o ${zl(allModules - PLANS.full.grossCents)} zł niż BASIC ze wszystkimi modułami osobno (${zl(allModules)} zł).`}
                        featured
                    />
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-12">
                    <div className="rounded-[6px] border border-line bg-white p-7 lg:col-span-7">
                        <h3 className="text-[1.0625rem] font-semibold text-ink">Moduły do planu BASIC</h3>
                        <ul className="mt-4 grid gap-x-8 sm:grid-cols-2">
                            {ADD_ONS.map((a) => (
                                <li key={a.name} className="flex items-baseline justify-between gap-4 border-b border-line py-3">
                                    <span className="min-w-0">
                                        <span className="block text-[0.9375rem] text-ink">{a.name}</span>
                                        <span className="block text-[0.8125rem] text-muted">{a.note}</span>
                                    </span>
                                    <span className="shrink-0 text-[0.875rem] font-medium text-ink tabular-nums">{zl(a.grossCents)} zł</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="rounded-[6px] border border-line bg-white p-7 lg:col-span-5">
                        <div className="flex items-baseline justify-between gap-4">
                            <h3 className="text-[1.0625rem] font-semibold text-ink">Pakiety SMS</h3>
                            <span className="text-[0.8125rem] text-muted">jednorazowo, brutto</span>
                        </div>
                        <p className="mt-2 text-[0.875rem] text-muted">Niewykorzystane SMS-y zostają na koncie.</p>
                        <table className="mt-4 w-full border-collapse text-[0.9375rem]">
                            <thead>
                                <tr className="text-left text-[0.75rem] font-medium tracking-wide text-muted uppercase">
                                    <th className="pb-2 font-medium">SMS</th>
                                    <th className="pb-2 text-right font-medium">za SMS</th>
                                    <th className="pb-2 text-right font-medium">pakiet</th>
                                </tr>
                            </thead>
                            <tbody>
                                {SMS_PACKAGES.map((p) => (
                                    <tr key={p.credits} className="border-t border-line">
                                        <td className="py-2.5 text-ink tabular-nums">{p.credits.toLocaleString('pl-PL')}</td>
                                        <td className="py-2.5 text-right text-muted tabular-nums">{Math.round(p.grossCents / p.credits)} gr</td>
                                        <td className="py-2.5 text-right font-medium text-ink tabular-nums">{zl(p.grossCents)} zł</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <p className="mt-6 text-[0.8125rem] text-muted">
                    Ceny planów i modułów brutto (z 23% VAT), miesięcznie, za jedno studio.
                </p>
            </div>
        </section>
    );
}

function Plan({
    name,
    lead,
    grossCents,
    includes,
    note,
    featured = false,
}: {
    name: string;
    lead: string;
    grossCents: number;
    includes: readonly string[];
    note?: string;
    featured?: boolean;
}) {
    return (
        <div
            className={`flex flex-col rounded-[6px] bg-white p-8 ${
                featured
                    ? 'border-2 border-accent shadow-[0_20px_50px_-24px_rgb(30_115_190/0.45)]'
                    : 'border border-line'
            }`}
        >
            <div className="flex items-center justify-between gap-4">
                <h3 className="text-[1.375rem] font-bold tracking-[-0.01em] text-ink">{name}</h3>
                {featured && (
                    <span className="rounded-full bg-accent-soft px-3 py-1 text-[0.75rem] font-medium text-accent">Wszystkie moduły</span>
                )}
            </div>
            <p className="mt-2 text-[0.9375rem] leading-[1.6]">{lead}</p>

            <p className="mt-7 flex items-baseline gap-2">
                <span className="text-[3.25rem] leading-none font-bold tracking-[-0.03em] text-ink tabular-nums">{zl(grossCents)}</span>
                <span className="text-[0.9375rem] text-muted">zł / mies.</span>
            </p>
            <p className="mt-2 text-[0.8125rem] text-muted tabular-nums">
                netto {zl(net(grossCents))} zł, dziennie ok. {zl(perDay(grossCents))} zł
            </p>

            <ul className="mt-7 flex flex-1 flex-col gap-3">
                {includes.map((item) => (
                    <li key={item} className="flex gap-3 text-[0.9375rem] leading-[1.5] text-ink">
                        <CheckIcon className={`mt-[0.15em] size-[1.05rem] shrink-0 ${featured ? 'text-accent' : 'text-muted'}`} />
                        {item}
                    </li>
                ))}
            </ul>
            {note && <p className="mt-6 text-[0.8125rem] leading-relaxed text-accent">{note}</p>}

            <a
                href={SIGNUP_URL}
                className={`mt-8 ${
                    featured
                        ? btnPrimary
                        : 'inline-flex h-12 items-center justify-center rounded-[4px] border border-line px-6 text-[0.9375rem] font-medium text-ink transition-colors hover:border-accent hover:text-accent'
                }`}
            >
                Wypróbuj 3 miesiące za darmo
            </a>
        </div>
    );
}

/* ─── Wezwanie i stopka ──────────────────────────────────────────────────── */

function Cta() {
    return (
        <section aria-labelledby="cta-title" className="bg-accent text-white">
            <div className={`${wrap} flex flex-col gap-8 py-20 lg:flex-row lg:items-center lg:justify-between`}>
                <div className="max-w-[38rem]">
                    <h2 id="cta-title" className="text-[clamp(1.75rem,3.4vw,2.375rem)] leading-[1.2] font-bold tracking-[-0.02em] text-balance">
                        Jedno miejsce. Wszystkie procesy. Pełna kontrola.
                    </h2>
                    <p className="mt-3 text-[1rem] text-white/85">Twój biznes uporządkowany w jednym miejscu.</p>
                    <p className="mt-1 text-[0.875rem] text-white/70">{OFFER_TERMS.join(', ')}.</p>
                </div>
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                    <a
                        href={SIGNUP_URL}
                        className="inline-flex h-12 items-center justify-center gap-2.5 rounded-[4px] bg-white px-6 text-[0.9375rem] font-medium whitespace-nowrap text-accent transition-colors hover:bg-accent-soft"
                    >
                        <PowerIcon className="size-[1.05rem]" />
                        Wypróbuj za darmo
                    </a>
                    <a href={DEMO_URL} className="inline-flex h-12 items-center gap-2.5 text-[0.9375rem] font-medium whitespace-nowrap text-white/90 hover:text-white">
                        <DotsIcon className="size-[1.05rem]" />
                        Konto demo bez rejestracji
                    </a>
                </div>
            </div>
        </section>
    );
}

function Footer() {
    return (
        <footer id="kontakt" className="scroll-mt-24 bg-mist">
            <div className={`${wrap} grid gap-10 py-14 text-[0.875rem] leading-relaxed sm:grid-cols-2 lg:grid-cols-12`}>
                <div className="lg:col-span-4">
                    <Logo />
                    <p className="mt-3 max-w-[18rem] text-muted">System dla studiów auto detailingu.</p>
                </div>
                <div className="lg:col-span-3">
                    <p className="font-medium text-ink">{COMPANY.name}</p>
                    {COMPANY.address.map((line) => (
                        <p key={line}>{line}</p>
                    ))}
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 self-start lg:col-span-3">
                    {COMPANY.registry.map(([label, value]) => (
                        <div key={label} className="contents">
                            <dt className="whitespace-nowrap text-muted">{label}</dt>
                            <dd className="text-ink tabular-nums">{value}</dd>
                        </div>
                    ))}
                </dl>
                <nav aria-label="Aplikacja" className="flex flex-col gap-1 lg:col-span-2 lg:items-end">
                    <a href={LOGIN_URL} className="text-ink hover:text-accent">
                        Zaloguj
                    </a>
                    <a href={SIGNUP_URL} className="whitespace-nowrap text-ink hover:text-accent">
                        Załóż konto
                    </a>
                </nav>
            </div>
            <div className="border-t border-line">
                <p className={`${wrap} py-6 text-[0.8125rem] text-muted`}>
                    © {new Date().getFullYear()} {COMPANY.name}
                </p>
            </div>
        </footer>
    );
}

export default function App() {
    return (
        <div id="top" className="scroll-mt-24 overflow-x-clip">
            <Header />
            <main>
                <Hero />
                <Pillars />
                <Anywhere />
                <Features />
                <Ksef />
                <Pricing />
                <Cta />
            </main>
            <Footer />
        </div>
    );
}
