import { useRef } from 'react';
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
    { text: 'Wycena', scene: 'lead', beat: 'accept', size: 3, outline: true, r: -24, spot: { side: 'r', x: 30, y: 75 }, pile: 2 },
    { text: 'Kalendarz', scene: 'lead', beat: 'calendar', size: 3, r: -90, spot: { side: 'l', x: 10, y: 37 }, pile: 11 },
    { text: 'Rezerwacje', scene: 'lead', beat: 'form', size: 3, r: 12, spot: { side: 'r', x: 44, y: 31 }, pile: 5 },
    { text: 'SMS', scene: 'lead', beat: 'sms', size: 4, r: -12, spot: { side: 'l', x: 34, y: 5 }, pile: 17 },
    { text: 'Przyjęcie auta', scene: 'checkin', beat: 'reservation', size: 2, r: -9, spot: { side: 'r', x: 46, y: 18 }, pile: 9 },
    { text: 'Depozyt', scene: 'checkin', beat: 'deposit', size: 3, outline: true, r: -7, spot: { side: 'l', x: 52, y: 41 }, pile: 0 },
    { text: 'Zdjęcia przez QR', scene: 'checkin', beat: 'qr', size: 2, r: -21, spot: { side: 'r', x: 50, y: 43 }, pile: 13 },
    { text: 'Mapa uszkodzeń', scene: 'checkin', beat: 'damage', size: 2, r: -13, spot: { side: 'l', x: 72, y: 28 }, pile: 4 },
    { text: 'Podpis na tablecie', scene: 'checkin', beat: 'sign-protocol', size: 2, r: 4, spot: { side: 'r', x: 50, y: 83 }, pile: 16 },
    { text: 'Zgody marketingowe', scene: 'checkin', beat: 'sign-consent', size: 1, r: -7, spot: { side: 'l', x: 52, y: 91 }, pile: 8 },
    { text: 'Protokół wydania', scene: 'handover', beat: 'protocol', size: 1, r: 8, spot: { side: 'r', x: 42, y: 65 }, pile: 1 },
    { text: 'Faktura VAT', scene: 'handover', beat: 'invoice', size: 3, r: -9, spot: { side: 'l', x: 46, y: 53 }, pile: 15 },
    { text: 'KSeF', scene: 'handover', beat: 'ksef', size: 4, keepCase: true, r: 10, spot: { side: 'r', x: 58, y: 7 }, pile: 6 },
    { text: 'Koszty', scene: 'costs', size: 4, outline: true, r: 3, spot: { side: 'r', x: 42, y: 55 }, pile: 12 },
    { text: 'Reguły po NIP', scene: 'costs', beat: 'new-rule', size: 1, r: 19, spot: { side: 'l', x: 32, y: 70 }, pile: 3 },
    { text: 'Statystyki', scene: 'costs', beat: 'stats', size: 2, r: 90, spot: { side: 'r', x: 93, y: 72 }, pile: 19 },
    { text: 'Konkurencja', scene: 'instagram', beat: 'alert', size: 3, r: 9, spot: { side: 'l', x: 54, y: 80 }, pile: 10 },
    { text: 'Biblioteka reklam', scene: 'instagram', beat: 'area', size: 1, r: -10, spot: { side: 'r', x: 54, y: 93 }, pile: 18 },
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
                            className="beam relative inline-flex h-12 w-full items-center justify-center rounded-lg bg-paper px-7 text-[0.9375rem] font-medium tracking-[-0.01em] text-void shadow-[0_10px_40px_-10px_rgb(220_174_92/0.55)] transition-[background-color,transform] duration-200 hover:bg-gold-50 active:translate-y-px sm:w-auto"
                        >
                            Rozpocznij za darmo
                        </a>
                        <a
                            href="#"
                            className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-line-strong bg-white/[0.02] px-7 text-[0.9375rem] font-medium tracking-[-0.01em] text-paper backdrop-blur-sm transition-colors duration-200 hover:border-paper/40 hover:bg-white/[0.05] sm:w-auto"
                        >
                            Otwórz konto demo
                        </a>
                    </div>
                    <p className="mt-5 text-[0.8125rem] text-dim">
                        Konto demo bez rejestracji, z danymi przykładowego studia.
                    </p>
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
