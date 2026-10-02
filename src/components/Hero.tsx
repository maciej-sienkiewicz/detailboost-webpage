import { AppWindow } from './AppWindow';

type Feature = {
    title: string;
    body: string;
    specs: ReadonlyArray<readonly [label: string, value: string]>;
};

/*
 * Każde zdanie poniżej da się sprawdzić w kodzie CRM. Strona sprzedaje system, którego
 * klient zaraz dotknie - obietnica bez pokrycia wraca tu jako zgłoszenie, nie jako
 * sprzedaż. Czego system NIE robi (np. przeciągania wizyt w kalendarzu, synchronizacji
 * z Kalendarzem Google, eksportu CSV klientów), tego tu nie ma.
 */
const LEFT: readonly Feature[] = [
    {
        title: 'Automatyczne przypomnienia SMS',
        body: 'Przypomnienie wychodzi samo, z wyprzedzeniem w minutach, godzinach lub dniach. Imię, datę i godzinę wstawia szablon.',
        specs: [
            ['Bramka', 'SMSAPI.pl'],
            ['Okno wysyłki', '12:00–18:00'],
        ],
    },
    {
        title: 'Zarządzanie kalendarzem',
        body: 'Rezerwacje i wizyty w widoku dnia, tygodnia, miesiąca lub listy. Terminy cykliczne co tydzień albo co miesiąc.',
        specs: [
            ['Siatka dnia', '06:00–20:00'],
            ['Krok', '30 min'],
        ],
    },
];

const RIGHT: readonly Feature[] = [
    {
        title: 'Integracja z KSeF',
        body: 'Faktura powstaje przy wydaniu pojazdu, UPO pobiera się samo. Faktury kosztowe synchronizują się co 15 minut.',
        specs: [
            ['Schemat', 'FA(3)'],
            ['Awaria KSeF', 'offline24'],
        ],
    },
    {
        title: 'Baza klientów',
        body: 'Pojazdy, historia wizyt, zgody marketingowe i przychód z każdego klienta. Duplikaty wykrywane po telefonie i e-mailu.',
        specs: [
            ['Dane firmy', 'z GUS po NIP'],
            ['Import', 'vCard (.vcf)'],
        ],
    },
];

export function Hero() {
    return (
        <section aria-labelledby="hero-title" className="relative">
            {/* Linie siatki: krawędzie kolumny treści, widoczne dopiero tam, gdzie
                strona ma marginesy. Porządkują wzrok bez dokładania żadnego elementu. */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-full max-w-[100rem] -translate-x-1/2 border-x border-rule 2xl:block"
            />

            <div className="relative mx-auto max-w-[100rem] px-5 pt-16 pb-20 sm:px-8 sm:pt-20 sm:pb-28 lg:px-12 xl:pt-24">
                <header className="mx-auto max-w-[56rem] text-center">
                    <p className="text-[0.8125rem] font-medium tracking-[-0.005em] text-mute">
                        CRM dla studiów auto detailingu
                    </p>

                    <h1
                        id="hero-title"
                        className="mt-6 text-[clamp(2.625rem,7.2vw,5.75rem)] leading-[0.96] font-[620] tracking-[-0.042em] text-balance text-ink"
                    >
                        Zarządzaj studiem <span className="text-mute">w&nbsp;jednym miejscu.</span>
                    </h1>

                    <p className="mx-auto mt-7 max-w-[38rem] text-[1.0625rem] leading-[1.6] tracking-[-0.011em] text-pretty text-graphite sm:text-lg">
                        Rezerwacje, przyjęcie pojazdu, protokół wydania, faktura w KSeF i historia
                        każdego klienta. Jeden system od pierwszego telefonu do odbioru auta.
                    </p>

                    <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <a
                            href="#"
                            className="inline-flex h-11 w-full items-center justify-center rounded-[2px] bg-ink px-6 text-[0.875rem] font-medium tracking-[-0.005em] text-paper transition-colors duration-150 hover:bg-graphite sm:w-auto"
                        >
                            Rozpocznij za darmo
                        </a>
                        <a
                            href="#"
                            className="inline-flex h-11 w-full items-center justify-center rounded-[2px] border border-rule px-6 text-[0.875rem] font-medium tracking-[-0.005em] text-ink transition-colors duration-150 hover:border-ink sm:w-auto"
                        >
                            Otwórz konto demo
                        </a>
                    </div>
                </header>

                {/*
                 * Kolejność w DOM = kolejność czytania na telefonie: najpierw okno aplikacji,
                 * potem korzyści. Od xl siatka 1 / okno / 1 ustawia je symetrycznie - dlatego
                 * kolumny boczne mają stałą szerokość, a całą resztę bierze okno.
                 */}
                <div className="mt-16 grid grid-cols-1 gap-x-10 gap-y-14 sm:mt-20 md:grid-cols-2 xl:mt-20 xl:grid-cols-[14rem_minmax(0,1fr)_14rem] xl:grid-rows-[auto_auto] xl:gap-x-12 xl:gap-y-10 2xl:grid-cols-[16rem_minmax(0,1fr)_16rem] 2xl:gap-x-16">
                    <div className="md:col-span-2 xl:col-span-1 xl:col-start-2 xl:row-span-2 xl:row-start-1">
                        <AppWindow
                            address="detailboost.pl/calendar"
                            alt="Kalendarz DetailBoost z wizytami studia: godziny, usługa i auto, klient, status."
                            desktop={{
                                src: '/screens/calendar-week-1440.webp',
                                srcSet: '/screens/calendar-week-1440.webp 1440w, /screens/calendar-week-2880.webp 2880w',
                                caption: 'Widok tygodnia w kalendarzu. Zrzut z aplikacji, konto demonstracyjne.',
                            }}
                            mobile={{
                                srcSet: '/screens/calendar-mobile-780.webp 780w',
                                caption: 'Kalendarz na telefonie. Zrzut z aplikacji, konto demonstracyjne.',
                            }}
                        />
                    </div>

                    <FeatureColumn features={LEFT} start={1} className="xl:col-start-1 xl:row-start-1" />
                    <FeatureColumn features={RIGHT} start={3} className="xl:col-start-3 xl:row-start-1" />
                </div>
            </div>
        </section>
    );
}

function FeatureColumn({
    features,
    start,
    className = '',
}: {
    features: readonly Feature[];
    start: number;
    className?: string;
}) {
    return (
        <ol
            start={start}
            className={`flex flex-col gap-12 xl:row-span-2 xl:grid xl:grid-rows-subgrid xl:gap-y-10 ${className}`}
        >
            {features.map((feature, i) => (
                <FeatureBlock key={feature.title} feature={feature} index={start + i} />
            ))}
        </ol>
    );
}

/**
 * Od xl kolumna boczna dzieli wiersze z resztą siatki (subgrid), zamiast układać bloki
 * sama. `justify-between` stawiał drugi blok po lewej i po prawej na innej wysokości,
 * a dwa sztywne wiersze po 50% przepełniały się przy 1280 px, gdy okno aplikacji jest
 * niższe od opisów. Wspólny wiersz mierzy oba bloki naraz i bierze wyższy.
 *
 * Numer stoi w osobnej kolumnie siatki, przed krawędzią tekstu - tytuł i opis
 * zaczynają się w jednej pionie, a numer „wisi" na lewym marginesie bloku.
 * Gruba linia nad blokiem (1 px czerni) zastępuje ikonę: mówi „tu zaczyna się
 * rzecz", nie udając obrazka.
 */
function FeatureBlock({ feature, index }: { feature: Feature; index: number }) {
    return (
        <li className="grid grid-cols-[2.25rem_minmax(0,1fr)] content-start border-t border-ink pt-5">
            <span
                aria-hidden
                className="pt-[0.1875rem] text-[0.75rem] font-medium tracking-[0.02em] text-mute tabular-nums"
            >
                {String(index).padStart(2, '0')}.
            </span>
            <div>
                <h3 className="text-[1.0625rem] leading-[1.3] font-[620] tracking-[-0.022em] text-balance text-ink">
                    {feature.title}
                </h3>
                <p className="mt-3 text-[0.875rem] leading-[1.6] xl:text-[0.8125rem] tracking-[-0.006em] text-pretty text-graphite">
                    {feature.body}
                </p>
                <dl className="mt-4 border-t border-rule">
                    {feature.specs.map(([label, value]) => (
                        <div
                            key={label}
                            className="flex items-baseline justify-between gap-4 border-b border-rule py-1.5 text-[0.75rem] leading-[1.4]"
                        >
                            <dt className="shrink-0 text-mute">{label}</dt>
                            <dd className="text-right font-medium whitespace-nowrap text-ink tabular-nums">{value}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </li>
    );
}
