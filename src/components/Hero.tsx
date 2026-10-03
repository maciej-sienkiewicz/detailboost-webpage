import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { DeviceFrame, Stage3D } from './Stage3D';
import { SceneBar, SceneVideos, type Player } from './ScenePlayer';
import { FeatureIndex, type ItemState } from './FeatureIndex';
import { SCENES, findStep } from '../scenes';
import { DEMO_URL, OFFER_TERMS, SIGNUP_URL } from '../site';
import { btnPrimary, btnSecondary } from './ui';

type Feature = {
    text: string;
    /** Nagranie (`Scene.id`) i krok w nim (`Beat.id`); bez kroku - nagranie od początku. */
    scene: string;
    beat?: string;
};

/*
 * Same nazwy funkcji, bez opisów: opis jest na nagraniu, do którego napis prowadzi.
 * Każdy napis to krok, który widać w oknie, więc da się go sprawdzić w CRM - strona
 * sprzedaje system, którego klient zaraz dotknie. Czego system NIE robi (np.
 * przeciągania wizyt w kalendarzu, synchronizacji z Kalendarzem Google, eksportu CSV
 * klientów), tego tu nie ma.
 *
 * Kolejność = kolejność nagrań i kroków w nich; spis przy oknie grupuje je po nagraniu.
 */
const FEATURES: readonly Feature[] = [
    { text: 'Historia klienta', scene: 'lead', beat: 'history' },
    { text: 'Poczta', scene: 'lead', beat: 'thread' },
    { text: 'Wycena', scene: 'lead', beat: 'accept' },
    { text: 'Kalendarz', scene: 'lead', beat: 'calendar' },
    { text: 'Rezerwacje', scene: 'lead', beat: 'form' },
    { text: 'SMS', scene: 'lead', beat: 'sms' },
    { text: 'Przyjęcie auta', scene: 'checkin', beat: 'reservation' },
    { text: 'Depozyt', scene: 'checkin', beat: 'deposit' },
    { text: 'Zdjęcia przez QR', scene: 'checkin', beat: 'qr' },
    { text: 'Mapa uszkodzeń', scene: 'checkin', beat: 'damage' },
    { text: 'Podpis na tablecie', scene: 'checkin', beat: 'sign-protocol' },
    { text: 'Zgody marketingowe', scene: 'checkin', beat: 'sign-consent' },
    { text: 'Karta Wizyty', scene: 'visitcard', beat: 'card-modal' },
    { text: 'Usługi dodatkowe', scene: 'visitcard', beat: 'offer' },
    { text: 'Protokół wydania', scene: 'handover', beat: 'protocol' },
    { text: 'Faktura VAT', scene: 'handover', beat: 'invoice' },
    { text: 'KSeF', scene: 'handover', beat: 'ksef' },
    { text: 'Koszty', scene: 'costs' },
    { text: 'Reguły po NIP', scene: 'costs', beat: 'new-rule' },
    { text: 'Statystyki', scene: 'costs', beat: 'stats' },
    { text: 'Czas pracy', scene: 'team', beat: 'worktime' },
    { text: 'Urlopy', scene: 'team', beat: 'leave' },
    { text: 'Konkurencja', scene: 'instagram', beat: 'alert' },
    { text: 'Biblioteka reklam', scene: 'instagram', beat: 'area' },
    { text: 'Powiadomienia push', scene: 'push', beat: 'intro' },
];

/** Napis → indeks nagrania, indeks kroku (-1 = początek) i sekunda, od której krok leci. */
const TARGETS = FEATURES.map((f) => findStep(f.scene, f.beat));
const INDEX = FEATURES.map((f, i) => ({ text: f.text, scene: TARGETS[i]!.scene }));

/**
 * Kolumny przy oknie: nagrania po kolei, podzielone tak, żeby obie kolumny miały
 * podobną liczbę wierszy (nagłówek grupy liczy się za dwa - zwykle łamie się na dwie
 * linie). Granica tam, gdzie różnica wierszy między kolumnami jest najmniejsza.
 */
const ROWS = SCENES.map((_, g) => 2 + INDEX.filter((item) => item.scene === g).length);
const TOTAL = ROWS.reduce((a, b) => a + b, 0);
const SPLIT = ROWS.reduce(
    (best, _, i) => {
        const left = ROWS.slice(0, i + 1).reduce((a, b) => a + b, 0);
        const diff = Math.abs(2 * left - TOTAL);
        return diff < best.diff ? { at: i + 1, diff } : best;
    },
    { at: 1, diff: Infinity },
).at;
const LEFT = SCENES.slice(0, SPLIT).map((_, i) => i);
const RIGHT = SCENES.slice(SPLIT).map((_, i) => SPLIT + i);

/**
 * Który napis świeci: ostatni krok sceny, który już minął. Zanim nagranie dojdzie
 * do pierwszego napisanego kroku (np. kalendarz przed przyjęciem auta), świeci
 * pierwszy napis sceny - to on zaraz nastąpi.
 */
function currentFeature(scene: number, beat: number) {
    let best = -1;
    let first = -1;
    TARGETS.forEach((t, i) => {
        if (t.scene !== scene) return;
        if (first < 0 || t.beat < (TARGETS[first]?.beat ?? Infinity)) first = i;
        if (t.beat <= beat && (best < 0 || t.beat >= (TARGETS[best]?.beat ?? -Infinity))) best = i;
    });
    return best >= 0 ? best : first;
}

export function Hero({ player }: { player: Player }) {
    const current = currentFeature(player.active, player.phase === 'intro' ? -1 : player.beat);
    const states: ItemState[] = TARGETS.map((t, i) =>
        i === current ? 'current' : t.scene === player.active ? 'scene' : 'idle',
    );
    const pick = (i: number) => {
        const t = TARGETS[i];
        if (t) player.jump(t.scene, t.at);
    };

    return (
        <section aria-labelledby="hero-title" className="relative">
            <div className="relative mx-auto max-w-[100rem] px-5 pt-10 pb-24 sm:px-8 sm:pt-16 sm:pb-32 lg:px-12 xl:pt-20">
                {/*
                 * Nagłówek jak plakat, tym samym krojem co znak „DETAIL BOOST". Po „do"
                 * przewijają się etapy pracy studia - zamiast akapitu z listą funkcji,
                 * którego nikt nie czyta - i zatrzymują się na „kolejnej wizyty." ze złotą
                 * kropką: praca ze stałym klientem się nie kończy. Biel to treść, złoto to jedyny akcent.
                 */}
                <header className="mx-auto max-w-[80rem]">
                    <h1
                        id="hero-title"
                        aria-label="Od telefonu do kolejnej wizyty."
                        className="font-display text-[clamp(2rem,9.6vw,3.25rem)] leading-[0.9] font-[800] tracking-[-0.03em] text-paper uppercase [font-stretch:74%] sm:text-[clamp(2.75rem,6.9vw,6.5rem)] sm:[font-stretch:104%]"
                    >
                        <span aria-hidden className="-my-[0.08em] block overflow-hidden py-[0.08em]">
                            <span className="hero-line block">Od telefonu</span>
                        </span>
                        <span aria-hidden className="-my-[0.08em] block overflow-hidden py-[0.08em]">
                            <span className="hero-line block whitespace-nowrap [animation-delay:110ms]">
                                do <StepWord />
                            </span>
                        </span>
                    </h1>

                    <div className="hero-rise mt-9 flex flex-col gap-6 border-t border-line pt-6 sm:mt-11 lg:flex-row lg:items-center lg:justify-between [animation-delay:420ms]">
                        <p className="font-ui text-[1.0625rem] font-medium tracking-[-0.015em] text-white/75 sm:text-lg">
                            CRM dla studiów auto detailingu.
                        </p>
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
                </header>

                {/*
                 * Kolejność w DOM = kolejność czytania na telefonie: okno aplikacji,
                 * sterowanie, spis funkcji pod nim. Od 1280 px spis dzieli się na dwie
                 * kolumny po obu stronach okna, wyrównane do okna.
                 */}
                <div className="mt-16 grid grid-cols-1 sm:mt-20 xl:mt-16 xl:grid-cols-[14rem_minmax(0,1fr)_14rem] xl:gap-x-10 2xl:grid-cols-[16rem_minmax(0,1fr)_16rem] 2xl:gap-x-14">
                    <div className="xl:col-start-2 xl:row-start-1">
                        <div id="nagrania" className="scroll-mt-28">
                            <Stage3D>
                                <DeviceFrame>
                                    <SceneVideos scenes={SCENES} player={player} />
                                </DeviceFrame>
                            </Stage3D>
                        </div>
                        <div className="mt-8 sm:mt-10">
                            <SceneBar scenes={SCENES} player={player} />
                        </div>
                        <p className="mt-5 text-[0.75rem] leading-relaxed text-dim">
                            Nagrania z działającego CRM, bez makiet. Tankowanie, SMS u klienta i powiadomienia na telefonie to animacje z danymi z CRM.
                        </p>
                        <FeatureIndex
                            scenes={SCENES}
                            groups={SCENES.map((_, i) => i)}
                            items={INDEX}
                            states={states}
                            onPick={pick}
                            side="flow"
                            className="mt-14 border-t border-white/[0.06] pt-10 xl:hidden"
                        />
                    </div>

                    <FeatureIndex
                        scenes={SCENES}
                        groups={LEFT}
                        items={INDEX}
                        states={states}
                        onPick={pick}
                        side="l"
                        className="hidden pt-2 xl:col-start-1 xl:row-start-1 xl:flex"
                    />
                    <FeatureIndex
                        scenes={SCENES}
                        groups={RIGHT}
                        items={INDEX}
                        states={states}
                        onPick={pick}
                        side="r"
                        className="hidden pt-2 xl:col-start-3 xl:row-start-1 xl:flex"
                    />
                </div>
            </div>
        </section>
    );
}

/**
 * Etapy po „do", w kolejności pracy studia. Nie kończą się na odbiorze auta: historia
 * klienta i przypomnienia SMS prowadzą do kolejnej wizyty - i ten etap zostaje na stałe.
 */
const STEPS = ['rezerwacji', 'przyjęcia', 'protokołu', 'faktury', 'odbioru auta', 'przypomnienia', 'kolejnej wizyty'] as const;

/**
 * Słowo po „do": etapy wjeżdżają od dołu i wyjeżdżają w górę spod maski, raz,
 * po wejściu nagłówka. Etapy w drodze są przygaszone - „jeszcze w toku" - a
 * ostatni ląduje pełną bielą ze złotą kropką. Bez ruchu (prefers-reduced-motion)
 * od razu stoi ostatni.
 */
function StepWord() {
    const [step, setStep] = useState(0);
    const last = STEPS.length - 1;

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setStep(last);
            return;
        }
        // Pierwszy etap stoi, aż wiersz skończy wjeżdżać; kolejne co 0,68 s.
        let i = 0;
        let timer = window.setTimeout(function tick() {
            i += 1;
            setStep(i);
            if (i < last) timer = window.setTimeout(tick, 680);
        }, 1300);
        return () => window.clearTimeout(timer);
    }, [last]);

    const done = step === last;
    return (
        <span className="relative -mb-[0.14em] inline-grid overflow-hidden pb-[0.14em] align-bottom">
            <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                    key={step}
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '-100%' }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    className={`col-start-1 row-start-1 block ${
                        done ? '' : 'text-white/30'
                    }`}
                >
                    {STEPS[step]}
                    {done && <span className="text-gold-400">.</span>}
                </motion.span>
            </AnimatePresence>
        </span>
    );
}

/**
 * Warunki oferty w jednej linijce, pod przyciskami: to, co właściciel studia chce
 * wiedzieć, zanim kliknie (karta? umowa? ile za darmo?). Rozdziela je cienka pionowa
 * kreska, nie kropka - kropki w środku zdania czytały się jak pozostawione znaki.
 */
export function OfferTerms({
    terms = OFFER_TERMS,
    className = '',
}: {
    terms?: readonly string[];
    className?: string;
}) {
    return (
        <ul className={`flex flex-wrap items-center gap-y-1 font-ui text-[0.8125rem] text-white/55 ${className}`}>
            {terms.map((term, i) => (
                <li key={term} className="flex items-center whitespace-nowrap">
                    {i > 0 && <span aria-hidden className="mx-3 h-3 w-px bg-white/20" />}
                    <span className={i === 0 && term === OFFER_TERMS[0] ? 'text-white/85' : ''}>{term}</span>
                </li>
            ))}
        </ul>
    );
}
