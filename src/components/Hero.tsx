import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { DeviceFrame, Stage3D } from './Stage3D';
import { SceneBar, SceneVideos, type Player } from './ScenePlayer';
import { FeatureSpill, type SpillWord, type WordState } from './FeatureSpill';
import { SCENES, findStep } from '../scenes';
import { DEMO_URL, OFFER_TERMS, SIGNUP_URL } from '../site';
import { btnPrimary, btnSecondary } from './ui';

type Feature = SpillWord & {
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
 * Kolejność = kolejność kroków w nagraniach (i czytania); miejsce na stronie jest
 * celowo inne - sąsiedzi na marginesie nie są sąsiadami w nagraniu.
 */
const FEATURES: readonly Feature[] = [
    { text: 'Poczta', scene: 'lead', beat: 'thread', size: 2, outline: true, r: 21, spot: { side: 'l', x: 80, y: 62 }, pile: 7 },
    { text: 'Historia klienta', scene: 'lead', beat: 'history', size: 2, r: 6, spot: { side: 'l', x: 58, y: 16 }, pile: 14 },
    { text: 'Wycena', scene: 'lead', beat: 'accept', size: 3, outline: true, r: -24, spot: { side: 'r', x: 30, y: 72 }, pile: 2 },
    { text: 'Kalendarz', scene: 'lead', beat: 'calendar', size: 3, r: -90, spot: { side: 'l', x: 10, y: 37 }, pile: 11 },
    { text: 'Rezerwacje', scene: 'lead', beat: 'form', size: 3, r: 12, spot: { side: 'r', x: 44, y: 31 }, pile: 5 },
    { text: 'SMS', scene: 'lead', beat: 'sms', size: 4, r: -12, spot: { side: 'l', x: 34, y: 5 }, pile: 17 },
    { text: 'Przyjęcie auta', scene: 'checkin', beat: 'reservation', size: 2, r: -9, spot: { side: 'r', x: 46, y: 18 }, pile: 9 },
    { text: 'Depozyt', scene: 'checkin', beat: 'deposit', size: 3, outline: true, r: -7, spot: { side: 'l', x: 52, y: 41 }, pile: 0 },
    { text: 'Zdjęcia przez QR', scene: 'checkin', beat: 'qr', size: 2, r: -21, spot: { side: 'r', x: 50, y: 43 }, pile: 13 },
    { text: 'Mapa uszkodzeń', scene: 'checkin', beat: 'damage', size: 2, r: -13, spot: { side: 'l', x: 72, y: 28 }, pile: 4 },
    { text: 'Podpis na tablecie', scene: 'checkin', beat: 'sign-protocol', size: 2, r: 4, spot: { side: 'r', x: 52, y: 82 }, pile: 16 },
    { text: 'Zgody marketingowe', scene: 'checkin', beat: 'sign-consent', size: 1, r: -7, spot: { side: 'l', x: 52, y: 91 }, pile: 8 },
    { text: 'Karta Wizyty', scene: 'visitcard', beat: 'card-modal', size: 2, r: -8, spot: { side: 'r', x: 60, y: 89 }, pile: 21 },
    { text: 'Usługi dodatkowe', scene: 'visitcard', beat: 'offer', size: 1, r: -16, spot: { side: 'l', x: 30, y: 22 }, pile: 23 },
    { text: 'Protokół wydania', scene: 'handover', beat: 'protocol', size: 1, r: 8, spot: { side: 'r', x: 42, y: 65 }, pile: 1 },
    { text: 'Faktura VAT', scene: 'handover', beat: 'invoice', size: 3, r: -9, spot: { side: 'l', x: 46, y: 53 }, pile: 15 },
    { text: 'KSeF', scene: 'handover', beat: 'ksef', size: 4, keepCase: true, r: 10, spot: { side: 'r', x: 58, y: 7 }, pile: 6 },
    { text: 'Koszty', scene: 'costs', size: 4, outline: true, r: 3, spot: { side: 'r', x: 42, y: 55 }, pile: 12 },
    { text: 'Reguły po NIP', scene: 'costs', beat: 'new-rule', size: 1, r: 19, spot: { side: 'l', x: 32, y: 70 }, pile: 3 },
    { text: 'Statystyki', scene: 'costs', beat: 'stats', size: 2, r: 90, spot: { side: 'r', x: 93, y: 72 }, pile: 19 },
    { text: 'Czas pracy', scene: 'team', beat: 'worktime', size: 2, outline: true, r: -6, spot: { side: 'r', x: 26, y: 24 }, pile: 20 },
    { text: 'Urlopy', scene: 'team', beat: 'leave', size: 3, r: 14, spot: { side: 'l', x: 22, y: 61 }, pile: 24 },
    { text: 'Konkurencja', scene: 'instagram', beat: 'alert', size: 3, r: 9, spot: { side: 'l', x: 54, y: 80 }, pile: 10 },
    { text: 'Biblioteka reklam', scene: 'instagram', beat: 'area', size: 1, r: 6, spot: { side: 'r', x: 42, y: 97 }, pile: 18 },
    { text: 'Powiadomienia push', scene: 'push', beat: 'intro', size: 1, r: 5, spot: { side: 'l', x: 46, y: 99 }, pile: 22 },
];

/** Napis → indeks nagrania, indeks kroku (-1 = początek) i sekunda, od której krok leci. */
const TARGETS = FEATURES.map((f) => findStep(f.scene, f.beat));

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
    const stage = useRef<HTMLDivElement>(null);
    const current = currentFeature(player.active, player.phase === 'intro' ? -1 : player.beat);
    const states: WordState[] = TARGETS.map((t, i) =>
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
                 * Kolejność w DOM = kolejność czytania na telefonie: okno aplikacji, stos
                 * napisów tuż pod nim (stuknięcie zmienia to, co widać nad palcem), potem
                 * sterowanie. Od 1280 px napisy wysypują się na marginesy przy oknie.
                 */}
                <div className="mt-16 grid grid-cols-1 sm:mt-20 xl:mt-16 xl:grid-cols-[14rem_minmax(0,1fr)_14rem] xl:gap-x-10 2xl:grid-cols-[16rem_minmax(0,1fr)_16rem] 2xl:gap-x-14">
                    <div className="xl:col-start-2 xl:row-start-1">
                        <div ref={stage} id="nagrania" className="scroll-mt-28">
                            <Stage3D>
                                <DeviceFrame>
                                    <SceneVideos scenes={SCENES} player={player} />
                                </DeviceFrame>
                            </Stage3D>
                        </div>
                        <FeatureSpill
                            words={FEATURES}
                            states={states}
                            onPick={pick}
                            origin={stage}
                            layout="pile"
                            className="mt-10 sm:mt-14 xl:hidden"
                        />
                        <div className="mt-8 sm:mt-10">
                            <SceneBar scenes={SCENES} player={player} />
                        </div>
                        <p className="mt-5 text-[0.75rem] leading-relaxed text-dim">
                            Nagrania z działającego CRM, bez makiet. Tankowanie, SMS u klienta i powiadomienia na telefonie to animacje z danymi z CRM.
                        </p>
                    </div>

                    {/* Marginesy po obu stronach okna, na wysokość całego bloku. Napisy
                        stoją w nich w procentach, część celowo zachodzi na krawędź okna. */}
                    <FeatureSpill
                        words={FEATURES}
                        states={states}
                        onPick={pick}
                        origin={stage}
                        layout="l"
                        className="hidden xl:col-start-1 xl:row-start-1 xl:block"
                    />
                    <FeatureSpill
                        words={FEATURES}
                        states={states}
                        onPick={pick}
                        origin={stage}
                        layout="r"
                        className="hidden xl:col-start-3 xl:row-start-1 xl:block"
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
 * wiedzieć, zanim kliknie (karta? umowa? ile za darmo?). Kropki rozdzielające, bez ikon.
 */
export function OfferTerms({ className = '' }: { className?: string }) {
    return (
        <p className={`font-ui text-[0.8125rem] text-white/55 ${className}`}>
            {OFFER_TERMS.map((term, i) => (
                <span key={term} className="whitespace-nowrap">
                    {i > 0 && <span aria-hidden className="mx-2 text-white/25">·</span>}
                    <span className={i === 0 ? 'text-white/85' : ''}>{term}</span>
                </span>
            ))}
        </p>
    );
}
