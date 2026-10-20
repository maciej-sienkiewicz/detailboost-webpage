import { useEffect, useRef, useState } from 'react';
import { ANIMACJE, KATEGORIE, dlugosc, rozdzialy, sciezka, type Animacja } from './animacje';

const TYTUL = 'Poznaj program, DetailBoost';

/**
 * Podstrona „Poznaj program": wszystkie animacje-instrukcje CRM w działach.
 *
 * Bez routera: lista i odtwarzacz to jeden widok przełączany kotwicą. `#<slug>`
 * otwiera animację, `#<dział>` przewija listę do działu, pusta kotwica to lista.
 * Link do animacji da się więc skopiować i wysłać klientowi, a „Wstecz" w przeglądarce
 * wraca z animacji do listy.
 */
export function PoznajProgram() {
    const hash = useHash();
    const animacja = ANIMACJE.find((a) => a.slug === hash);

    useEffect(() => {
        document.title = animacja ? `${animacja.tytul} ${TYTUL}` : TYTUL;
        if (animacja) {
            window.scrollTo({ top: 0 });
            return;
        }
        // Dział z kotwicy („Wszystkie instrukcje" w odtwarzaczu wraca do działu animacji).
        const cel = hash && document.getElementById(hash);
        if (cel) cel.scrollIntoView({ block: 'start' });
        else window.scrollTo({ top: 0 });
    }, [animacja, hash]);

    return animacja ? <Odtwarzacz animacja={animacja} /> : <Lista />;
}

function useHash() {
    const read = () => decodeURIComponent(window.location.hash.slice(1));
    const [hash, setHash] = useState(read);
    useEffect(() => {
        const on = () => setHash(read());
        window.addEventListener('hashchange', on);
        return () => window.removeEventListener('hashchange', on);
    }, []);
    return hash;
}

function Lista() {
    const minuty = Math.round(ANIMACJE.reduce((s, a) => s + a.czas, 0) / 60);

    return (
        <section aria-labelledby="poznaj-title" className="relative">
            <div className="mx-auto max-w-[100rem] px-5 pt-14 pb-24 sm:px-8 sm:pt-20 sm:pb-32 lg:px-12 xl:pt-24">
                <header className="mx-auto max-w-[60rem] text-center">
                    <p className="inline-flex items-center gap-3 font-mono text-[0.6875rem] font-medium tracking-[0.22em] text-mute uppercase">
                        <span aria-hidden className="h-px w-6 bg-gradient-to-r from-transparent to-gold-400" />
                        Instrukcje w animacjach
                        <span aria-hidden className="h-px w-6 bg-gradient-to-l from-transparent to-gold-400" />
                    </p>
                    <h1
                        id="poznaj-title"
                        className="mt-7 text-[clamp(2.5rem,6.4vw,5.25rem)] leading-[0.96] font-[620] tracking-[-0.05em] text-balance"
                    >
                        <span className="text-fill-silver">Poznaj program</span>{' '}
                        <span className="text-fill-gold pb-[0.08em]">krok po&nbsp;kroku.</span>
                    </h1>
                    <p className="mx-auto mt-7 max-w-[40rem] text-[1.0625rem] leading-[1.6] tracking-[-0.012em] text-pretty text-mute sm:text-lg">
                        Każda animacja pokazuje jedną czynność w CRM: opis mówi, po co jest krok, a ekran,
                        gdzie go zrobić. Rozdziały pod animacją przenoszą od razu do wybranego miejsca.
                    </p>
                    <p className="mt-6 font-mono text-[0.6875rem] tracking-[0.04em] text-dim tabular-nums">
                        {ANIMACJE.length} instrukcji · {KATEGORIE.length} działów · {minuty} min
                    </p>
                </header>

                <nav aria-label="Działy" className="mx-auto mt-12 max-w-[60rem]">
                    <ul className="flex flex-wrap justify-center gap-2">
                        {KATEGORIE.map((k) => (
                            <li key={k.id}>
                                <a
                                    href={`#${k.id}`}
                                    className="inline-flex h-9 items-center rounded-[3px] border border-line-strong px-3.5 text-[0.8125rem] font-medium text-mute transition-colors duration-150 hover:border-paper/40 hover:text-paper"
                                >
                                    {k.nazwa}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="mt-20 flex flex-col gap-20 sm:mt-24 sm:gap-24">
                    {KATEGORIE.map((k, i) => (
                        <Dzial key={k.id} kategoria={k} index={i} animacje={ANIMACJE.filter((a) => a.kategoria === k.id)} />
                    ))}
                </div>
            </div>
        </section>
    );
}

/**
 * Dział: nazwa w lewej kolumnie (od xl, wyżej nad kartami), karty w siatce obok.
 * Numer działu wisi przed nazwą jak numery korzyści w Hero.
 */
function Dzial({
    kategoria,
    index,
    animacje,
}: {
    kategoria: (typeof KATEGORIE)[number];
    index: number;
    animacje: readonly Animacja[];
}) {
    if (!animacje.length) return null;
    return (
        <section
            id={kategoria.id}
            aria-labelledby={`${kategoria.id}-title`}
            className="grid scroll-mt-24 grid-cols-1 gap-x-12 gap-y-8 xl:grid-cols-[16rem_minmax(0,1fr)] 2xl:gap-x-16"
        >
            <header className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] content-start pt-5">
                <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,var(--color-gold-200),var(--color-gold-600)_40%,var(--color-line-strong))]" />
                <span aria-hidden className="pt-[0.25rem] font-mono text-[0.6875rem] tracking-[0.04em] text-gold-200 tabular-nums">
                    {String(index + 1).padStart(2, '0')}.
                </span>
                <div>
                    <h2 id={`${kategoria.id}-title`} className="text-[1.375rem] leading-[1.2] font-[580] tracking-[-0.03em] text-balance text-paper">
                        {kategoria.nazwa}
                    </h2>
                    <p className="mt-3 text-[0.875rem] leading-[1.6] text-pretty text-mute">{kategoria.opis}</p>
                    <p className="mt-3 font-mono text-[0.6875rem] tracking-[0.04em] text-dim tabular-nums">
                        {animacje.length} {animacje.length === 1 ? 'instrukcja' : animacje.length < 5 ? 'instrukcje' : 'instrukcji'}
                    </p>
                </div>
            </header>

            <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3 xl:pt-5">
                {animacje.map((a) => (
                    <li key={a.slug}>
                        <Karta animacja={a} />
                    </li>
                ))}
            </ul>
        </section>
    );
}

function Karta({ animacja: a }: { animacja: Animacja }) {
    return (
        <a href={`#${a.slug}`} className="group block">
            <div className="relative aspect-video overflow-hidden rounded-[6px] border border-line-strong bg-surface">
                <img
                    src={`${sciezka(a)}plakat.webp`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={960}
                    height={540}
                    className="h-full w-full object-cover opacity-90 transition-[opacity,transform] duration-500 ease-out-expo group-hover:scale-[1.02] group-hover:opacity-100"
                />
                <span className="absolute right-2.5 bottom-2.5 rounded-[3px] bg-void/80 px-2 py-1 font-mono text-[0.6875rem] text-paper tabular-nums backdrop-blur-sm">
                    {dlugosc(a.czas)}
                </span>
            </div>
            <h3 className="mt-4 text-[1.0625rem] leading-[1.3] font-[560] tracking-[-0.025em] text-balance text-paper transition-colors duration-150 group-hover:text-gold-50">
                {a.tytul}
            </h3>
            <p className="mt-2 line-clamp-3 text-[0.875rem] leading-[1.6] tracking-[-0.006em] text-pretty text-mute">{a.opis}</p>
            <Meta animacja={a} className="mt-3" />
        </a>
    );
}

function Meta({ animacja: a, className = '' }: { animacja: Animacja; className?: string }) {
    return (
        <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.6875rem] tracking-[0.04em] text-dim tabular-nums ${className}`}>
            <span>{a.rodzaj === 'mp4' ? 'Film' : 'Animacja'}</span>
            {a.rozdzialy.length > 0 && <span>{rozdzialy(a.rozdzialy.length)}</span>}
            {a.status === 'robocza' && <span className="text-gold-400">Wersja robocza</span>}
        </p>
    );
}

function Odtwarzacz({ animacja: a }: { animacja: Animacja }) {
    const kategoria = KATEGORIE.find((k) => k.id === a.kategoria)!;
    const i = ANIMACJE.indexOf(a);
    const poprzednia = ANIMACJE[i - 1];
    const nastepna = ANIMACJE[i + 1];

    return (
        <section aria-labelledby="animacja-title" className="relative">
            <div className="mx-auto max-w-[80rem] px-5 pt-10 pb-24 sm:px-8 sm:pt-14 sm:pb-32 lg:px-12">
                <a
                    href={`#${kategoria.id}`}
                    className="font-mono text-[0.6875rem] tracking-[0.12em] text-mute uppercase transition-colors duration-150 hover:text-paper"
                >
                    Wszystkie instrukcje
                </a>

                <header className="mt-8 max-w-[52rem]">
                    <p className="font-mono text-[0.6875rem] tracking-[0.04em] text-gold-200">{kategoria.nazwa}</p>
                    <h1
                        id="animacja-title"
                        className="mt-3 text-[clamp(2rem,4.4vw,3.25rem)] leading-[1.02] font-[620] tracking-[-0.045em] text-balance"
                    >
                        <span className="text-fill-silver">{a.tytul}</span>
                    </h1>
                    <p className="mt-5 max-w-[44rem] text-[1.0625rem] leading-[1.6] tracking-[-0.012em] text-pretty text-mute">{a.opis}</p>
                    <Meta animacja={a} className="mt-4" />
                </header>

                <div className="relative mt-10">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-[8%] top-[10%] bottom-[10%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(220_174_92/0.16),transparent)] blur-3xl"
                    />
                    <div className="relative">
                        {a.rodzaj === 'mp4' ? <Film animacja={a} /> : <Ramka key={a.slug} animacja={a} />}
                    </div>
                </div>

                <nav aria-label="Inne instrukcje" className="mt-16 grid grid-cols-1 gap-6 border-t border-line pt-8 sm:grid-cols-2">
                    {poprzednia ? <Sasiad animacja={poprzednia} etykieta="Poprzednia" /> : <span />}
                    {nastepna && <Sasiad animacja={nastepna} etykieta="Następna" className="sm:text-right" />}
                </nav>
            </div>
        </section>
    );
}

/**
 * Animacja HTML w ramce. Odtwarzacz skaluje scenę do szerokości, więc wysokość
 * zależy od szerokości (i od zawijania rozdziałów) - ramka bierze ją z dokumentu
 * w środku i śledzi przy każdej zmianie. Animacja jest z tej samej domeny, więc
 * do jej dokumentu mamy dostęp; w środku sama włącza tryb osadzenia
 * (`public/animacje/osadzenie.css`).
 */
function Ramka({ animacja: a }: { animacja: Animacja }) {
    const ref = useRef<HTMLIFrameElement>(null);
    const [wysokosc, setWysokosc] = useState<number>();

    useEffect(() => {
        const frame = ref.current;
        if (!frame) return;
        let ro: ResizeObserver | undefined;
        const podlacz = () => {
            const doc = frame.contentDocument;
            if (!doc?.body) return;
            ro?.disconnect();
            const mierz = () => setWysokosc(Math.ceil(doc.documentElement.scrollHeight));
            ro = new ResizeObserver(mierz);
            ro.observe(doc.body);
            mierz();
        };
        frame.addEventListener('load', podlacz);
        if (frame.contentDocument?.readyState === 'complete') podlacz();
        return () => {
            frame.removeEventListener('load', podlacz);
            ro?.disconnect();
        };
    }, []);

    return (
        <iframe
            ref={ref}
            src={sciezka(a)}
            title={`Animacja: ${a.tytul}`}
            // Do pierwszego pomiaru ramka trzyma proporcje odtwarzacza, żeby strona nie skakała.
            style={wysokosc ? { height: wysokosc } : { aspectRatio: '16 / 11' }}
            className="block w-full border-0 bg-void"
        />
    );
}

function Film({ animacja: a }: { animacja: Animacja }) {
    return (
        <video
            key={a.slug}
            src={`${sciezka(a)}film.mp4`}
            poster={`${sciezka(a)}plakat.webp`}
            controls
            playsInline
            preload="metadata"
            className="block aspect-video w-full rounded-[6px] border border-line-strong bg-surface"
        >
            Twoja przeglądarka nie odtwarza filmów MP4.
        </video>
    );
}

function Sasiad({ animacja: a, etykieta, className = '' }: { animacja: Animacja; etykieta: string; className?: string }) {
    return (
        <a href={`#${a.slug}`} className={`group block ${className}`}>
            <span className="font-mono text-[0.6875rem] tracking-[0.12em] text-dim uppercase">{etykieta}</span>
            <span className="mt-2 block text-[1.0625rem] leading-[1.3] font-[560] tracking-[-0.025em] text-balance text-paper transition-colors duration-150 group-hover:text-gold-50">
                {a.tytul}
            </span>
        </a>
    );
}
