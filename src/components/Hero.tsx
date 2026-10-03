import { useRef, type ReactNode } from 'react';
import { DeviceFrame, Stage3D } from './Stage3D';
import { SceneControls, SceneTabs, SceneVideos, useScenePlayer } from './ScenePlayer';
import { FeatureSpill, type SpillWord, type WordState } from './FeatureSpill';
import { SCENES } from '../scenes';

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
const TARGETS = FEATURES.map((f) => {
    const scene = SCENES.findIndex((s) => s.id === f.scene);
    const beats = SCENES[scene]?.beats ?? [];
    const beat = f.beat ? beats.findIndex((b) => b.id === f.beat) : -1;
    if (scene < 0 || (f.beat && beat < 0)) throw new Error(`Napis „${f.text}" wskazuje krok, którego nie ma w nagraniu.`);
    return { scene, beat, at: beat >= 0 ? beats[beat]?.at : undefined };
});

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

export function Hero() {
    const player = useScenePlayer(SCENES);
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
                 * Nagłówek jak plakat, tym samym krojem co znak „DETAIL BOOST": duże
                 * rzeczowniki, małe przyimki. „od" i „do" wiszą w wąskiej kolumnie przed
                 * krawędzią tekstu, więc oba wiersze zaczynają się w jednej pionie - jak
                 * numer przed blokiem tekstu w siatce szwajcarskiej. Bez gradientów
                 * w literach: złota jest tylko kropka.
                 */}
                <header className="mx-auto max-w-[80rem]">
                    <h1
                        id="hero-title"
                        aria-label="Od telefonu do odbioru auta."
                        className="font-display text-[clamp(3rem,9vw,8.75rem)] leading-[0.86] font-[820] tracking-[-0.04em] text-paper uppercase [font-stretch:108%]"
                    >
                        <HeadLine small="od" delay={0}>
                            telefonu
                        </HeadLine>
                        <HeadLine small="do" delay={110}>
                            odbioru auta<span className="text-gold-400">.</span>
                        </HeadLine>
                    </h1>

                    <div className="hero-rise mt-10 grid gap-8 border-t border-line pt-6 sm:mt-12 lg:grid-cols-12 lg:gap-x-8 [animation-delay:420ms]">
                        <p className="max-w-[34rem] text-[1.0625rem] leading-[1.6] tracking-[-0.012em] text-pretty text-mute lg:col-span-6 xl:col-span-5">
                            <span className="text-paper">CRM dla studiów auto detailingu.</span> Rezerwacje,
                            przyjęcie pojazdu, protokół wydania, faktura w KSeF i historia każdego klienta
                            w jednym systemie.
                        </p>
                        <div className="flex flex-col gap-4 lg:col-span-6 lg:items-end xl:col-span-5 xl:col-start-8">
                            <div className="flex flex-col gap-2.5 sm:flex-row">
                                <a
                                    href="#"
                                    className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-6 font-ui text-[0.9375rem] font-semibold whitespace-nowrap text-[#0a0709] shadow-[inset_0_1px_0_0_rgb(255_255_255/0.6),0_14px_34px_-12px_rgb(220_174_92/0.8)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-gold-50 hover:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.6),0_16px_40px_-10px_rgb(220_174_92/0.95)] active:translate-y-px"
                                >
                                    Rozpocznij za darmo
                                </a>
                                <a
                                    href="#"
                                    className="inline-flex h-12 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.03] px-6 font-ui text-[0.9375rem] font-medium whitespace-nowrap text-white/80 transition-colors duration-200 hover:bg-white/[0.07] hover:text-white"
                                >
                                    Otwórz konto demo
                                </a>
                            </div>
                            <p className="text-[0.8125rem] text-dim">Konto demo bez rejestracji, z danymi przykładowego studia.</p>
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
                        <div ref={stage}>
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
                        <div className="mt-10 sm:mt-14 xl:mt-10">
                            <SceneControls scenes={SCENES} player={player} />
                        </div>
                        <div className="mt-8 sm:mt-10">
                            <SceneTabs scenes={SCENES} player={player} />
                        </div>
                        <p className="mt-6 text-center font-mono text-[0.6875rem] tracking-[0.04em] text-dim">
                            Nagrania z działającej aplikacji na koncie demonstracyjnym. Przyjęcie auta nagrane w oknie tabletu. Tankowanie, ekran SMS klienta i powiadomienia na telefonie to animacje z treściami z CRM, bo nie dzieją się w przeglądarce.
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
 * Wiersz nagłówka: mały przyimek w kolumnie o stałej szerokości, duże słowa obok.
 * Słowa wjeżdżają od dołu spod maski (overflow), jak plansza w kinie - wiersz po
 * wierszu, raz, przy wejściu na stronę.
 */
function HeadLine({ small, delay, children }: { small: string; delay: number; children: ReactNode }) {
    return (
        <span aria-hidden className="grid grid-cols-[0.62em_minmax(0,1fr)] items-start">
            <span
                className="hero-rise pt-[0.12em] text-[0.24em] leading-none font-[700] tracking-[0.02em] text-dim [font-stretch:100%]"
                style={{ animationDelay: `${delay + 160}ms` }}
            >
                {small}
            </span>
            <span className="-my-[0.08em] block overflow-hidden py-[0.08em]">
                <span className="hero-line block" style={{ animationDelay: `${delay}ms` }}>
                    {children}
                </span>
            </span>
        </span>
    );
}
