import { DeviceFrame, Stage3D } from './Stage3D';
import { SceneTabs, SceneVideos, useScenePlayer, type Scene } from './ScenePlayer';

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
const FEATURES: readonly Feature[] = [
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

// Względem `base` Vite, nie od korzenia serwera: strona bywa podawana z podkatalogu
// (podgląd, artefakt), a ścieżka „/scenes/…" celowałaby wtedy w cudzy katalog.
const SCENE_DIR = `${import.meta.env.BASE_URL}scenes/`;

/**
 * Trzy nagrania z działającego CRM (capture/). `features` mówi, które bloki korzyści
 * nagranie właśnie pokazuje - te dostają złotą linię, więc oko łączy obraz z tekstem.
 */
const SCENES: readonly (Scene & { features: readonly number[] })[] = [
    {
        id: 'reservation',
        title: 'Rezerwacja z historii klienta',
        summary: 'Stały klient pyta o termin. CRM pokazuje jego wizyty i obrót, podsuwa usługi z cennika i sam wypełnia rezerwację.',
        poster: `${SCENE_DIR}reservation-poster.webp`,
        video: `${SCENE_DIR}reservation`,
        features: [0, 1, 3],
    },
    {
        id: 'ksef',
        title: 'Faktura w KSeF przy wydaniu auta',
        summary: 'Auto gotowe, klient dostaje SMS. Przy wydaniu faktura VAT idzie do KSeF i wraca z numerem KSeF i kodem QR.',
        poster: `${SCENE_DIR}ksef-poster.webp`,
        video: `${SCENE_DIR}ksef`,
        features: [2],
    },
    {
        id: 'instagram',
        title: 'Nowa kampania u konkurencji',
        summary: 'Konkurent z okolicy ogłasza promocję i puszcza reklamę. Widzisz zasięg, odbiorców i treść, zanim zadzwoni klient.',
        poster: `${SCENE_DIR}instagram-poster.webp`,
        video: `${SCENE_DIR}instagram`,
        features: [],
    },
];

export function Hero() {
    const player = useScenePlayer(SCENES);
    const lit = new Set(SCENES[player.active]?.features ?? []);

    return (
        <section aria-labelledby="hero-title" className="relative">
            <div className="relative mx-auto max-w-[100rem] px-5 pt-14 pb-24 sm:px-8 sm:pt-20 sm:pb-32 lg:px-12 xl:pt-24">
                <header className="mx-auto max-w-[60rem] text-center">
                    <p className="inline-flex items-center gap-3 font-mono text-[0.6875rem] font-medium tracking-[0.22em] text-mute uppercase">
                        <span aria-hidden className="h-px w-6 bg-gradient-to-r from-transparent to-gold-400" />
                        CRM dla studiów auto detailingu
                        <span aria-hidden className="h-px w-6 bg-gradient-to-l from-transparent to-gold-400" />
                    </p>

                    <h1
                        id="hero-title"
                        className="mt-7 text-[clamp(2.75rem,7.6vw,6.25rem)] leading-[0.94] font-[620] tracking-[-0.052em] text-balance"
                    >
                        <span className="text-fill-silver">Zarządzaj studiem</span>{' '}
                        <span className="text-fill-gold pb-[0.08em]">w&nbsp;jednym miejscu.</span>
                    </h1>

                    <p className="mx-auto mt-7 max-w-[40rem] text-[1.0625rem] leading-[1.6] tracking-[-0.012em] text-pretty text-mute sm:text-lg">
                        Rezerwacje, przyjęcie pojazdu, protokół wydania, faktura w KSeF i historia
                        każdego klienta. Jeden system od pierwszego telefonu do odbioru auta.
                    </p>

                    <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <a
                            href="#"
                            className="beam relative inline-flex h-12 w-full items-center justify-center rounded-[4px] bg-paper px-7 text-[0.9375rem] font-medium tracking-[-0.01em] text-void shadow-[0_10px_40px_-10px_rgb(220_174_92/0.55)] transition-[background-color,transform] duration-200 hover:bg-gold-50 active:translate-y-px sm:w-auto"
                        >
                            Rozpocznij za darmo
                        </a>
                        <a
                            href="#"
                            className="inline-flex h-12 w-full items-center justify-center rounded-[4px] border border-line-strong bg-white/[0.02] px-7 text-[0.9375rem] font-medium tracking-[-0.01em] text-paper backdrop-blur-sm transition-colors duration-200 hover:border-paper/40 hover:bg-white/[0.05] sm:w-auto"
                        >
                            Otwórz konto demo
                        </a>
                    </div>
                    <p className="mt-5 text-[0.8125rem] text-dim">
                        Konto demo bez rejestracji, z danymi przykładowego studia.
                    </p>
                </header>

                {/*
                 * Kolejność w DOM = kolejność czytania na telefonie: najpierw okno aplikacji,
                 * potem korzyści. Od xl siatka 1 / okno / 1 ustawia je symetrycznie. Kolumny
                 * boczne dzielą wiersze z siatką (subgrid), więc drugi blok po lewej i po
                 * prawej zaczyna się na tej samej wysokości, niezależnie od długości opisów.
                 */}
                <div className="mt-16 grid grid-cols-1 gap-x-10 gap-y-14 sm:mt-20 md:grid-cols-2 xl:mt-16 xl:grid-cols-[14rem_minmax(0,1fr)_14rem] xl:grid-rows-[auto_auto] xl:gap-x-12 xl:gap-y-10 2xl:grid-cols-[16rem_minmax(0,1fr)_16rem] 2xl:gap-x-16">
                    <div className="md:col-span-2 xl:col-span-1 xl:col-start-2 xl:row-span-2 xl:row-start-1">
                        <Stage3D>
                            <DeviceFrame>
                                <SceneVideos scenes={SCENES} player={player} />
                            </DeviceFrame>
                        </Stage3D>
                        <div className="mt-10 sm:mt-12">
                            <SceneTabs scenes={SCENES} player={player} />
                        </div>
                        <p className="mt-6 text-center font-mono text-[0.6875rem] tracking-[0.04em] text-dim">
                            Nagrania z działającej aplikacji, konto demonstracyjne.
                        </p>
                    </div>

                    <FeatureColumn features={FEATURES.slice(0, 2)} start={0} lit={lit} className="xl:col-start-1 xl:row-start-1" />
                    <FeatureColumn features={FEATURES.slice(2)} start={2} lit={lit} className="xl:col-start-3 xl:row-start-1" />
                </div>
            </div>
        </section>
    );
}

function FeatureColumn({
    features,
    start,
    lit,
    className = '',
}: {
    features: readonly Feature[];
    start: number;
    lit: ReadonlySet<number>;
    className?: string;
}) {
    return (
        <ol
            start={start + 1}
            className={`flex flex-col gap-12 xl:row-span-2 xl:grid xl:grid-rows-subgrid xl:gap-y-10 ${className}`}
        >
            {features.map((feature, i) => (
                <FeatureBlock key={feature.title} feature={feature} index={start + i} lit={lit.has(start + i)} />
            ))}
        </ol>
    );
}

/**
 * Numer stoi w osobnej kolumnie siatki, przed krawędzią tekstu - tytuł i opis
 * zaczynają się w jednej pionie, a numer „wisi" na lewym marginesie bloku.
 * Linia nad blokiem zastępuje ikonę: mówi „tu zaczyna się rzecz", nie udając
 * obrazka. Złota linia = o tym jest nagranie, które właśnie leci.
 */
function FeatureBlock({ feature, index, lit }: { feature: Feature; index: number; lit: boolean }) {
    return (
        <li className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] content-start pt-5">
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-line-strong" />
            <span
                aria-hidden
                className={`absolute inset-x-0 top-0 h-px origin-left bg-[linear-gradient(90deg,var(--color-gold-200),var(--color-gold-600))] transition-transform duration-700 ease-out-expo ${
                    lit ? 'scale-x-100' : 'scale-x-0'
                }`}
            />
            <span
                aria-hidden
                className={`pt-[0.1875rem] font-mono text-[0.6875rem] tracking-[0.04em] tabular-nums transition-colors duration-500 ${
                    lit ? 'text-gold-200' : 'text-dim'
                }`}
            >
                {String(index + 1).padStart(2, '0')}.
            </span>
            <div>
                <h3 className="text-[1.0625rem] leading-[1.3] font-[560] tracking-[-0.025em] text-balance text-paper">
                    {feature.title}
                </h3>
                <p className="mt-3 text-[0.875rem] leading-[1.6] tracking-[-0.006em] text-pretty text-mute xl:text-[0.8125rem]">
                    {feature.body}
                </p>
                <dl className="mt-4 border-t border-line">
                    {feature.specs.map(([label, value]) => (
                        <div
                            key={label}
                            className="flex items-baseline justify-between gap-4 border-b border-line py-1.5 text-[0.75rem] leading-[1.4]"
                        >
                            <dt className="shrink-0 text-dim">{label}</dt>
                            <dd className="text-right font-mono text-[0.6875rem] whitespace-nowrap text-paper tabular-nums">
                                {value}
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>
        </li>
    );
}
