import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { BeatCaption, FocusRing, SceneCamera, type Beat } from './SceneOverlay';

export type Scene = {
    id: string;
    title: string;
    /** Jedno zdanie: co widać na nagraniu. Czytane razem z tytułem przez czytnik ekranu. */
    summary: string;
    poster: string;
    /** Ścieżka bez rozszerzenia: obok leżą `.webm` (VP9) i `.mp4` (H.264). */
    video: string;
    /** Podpisy kroków z kamerą i ramką; czasy z capture/*.timing.json. */
    beats?: readonly Beat[];
    /**
     * Animacja przed nagraniem - dla tego, czego nie da się nagrać w CRM (np. faktura,
     * którą kontrahent wystawia u siebie i wysyła do KSeF). `render` dostaje postęp 0–1.
     */
    intro?: { seconds: number; render: (progress: number) => ReactNode };
};

/**
 * Nagrania z działającego CRM, odtwarzane po kolei, z rozdziałami pod oknem.
 *
 * Wideo zamiast animowanych zrzutów: przejścia, rozwijane listy i podpowiedzi
 * wyglądają dokładnie tak, jak w aplikacji, bo SĄ aplikacją. Koszt pilnujemy tak:
 *  - na start pobiera się tylko pierwsze nagranie, następne dopiero gdy przyjdzie
 *    ich kolej (`preload="none"` do tego czasu, plakat zakrywa pustą klatkę);
 *  - VP9 w WebM, a H.264 w MP4 (z `faststart`) jako zapas dla Safari - przeglądarka
 *    bierze pierwsze źródło, które umie odtworzyć, i pobiera tylko je;
 *  - odtwarzanie staje, gdy okno wyjedzie z ekranu albo karta przejdzie w tło.
 *
 * Wideo stoi w oknie 3D, a rozdziały pod nim, płasko - dlatego stan żyje w hooku,
 * a obie części dostają go osobno. Pasek postępu idzie wprost do DOM, a do stanu
 * trafia tylko zmiana kroku i postęp animacji wstępnej w krokach co 1/60: stan
 * aktualizowany co klatkę przerysowywałby całe Hero.
 */
export function useScenePlayer(scenes: readonly Scene[]) {
    const [active, setActive] = useState(0);
    const [started, setStarted] = useState<ReadonlySet<number>>(() => new Set([0]));
    const [beat, setBeat] = useState(-1);
    const [focusOn, setFocusOn] = useState(false);
    const [phase, setPhase] = useState<'intro' | 'video'>(() => (scenes[0]?.intro ? 'intro' : 'video'));
    const [introProgress, setIntroProgress] = useState(0);
    const [paused, setPaused] = useState(false);
    const videos = useRef<(HTMLVideoElement | null)[]>([]);
    const bars = useRef<(HTMLSpanElement | null)[]>([]);
    const root = useRef<HTMLDivElement>(null);
    const inView = useRef(false);
    const reduced = useRef(false);
    const pausedRef = useRef(false);
    pausedRef.current = paused;
    const introElapsed = useRef(0);
    const phaseRef = useRef(phase);
    phaseRef.current = phase;
    /** Przeskok do chwili w nagraniu, wykonywany, gdy wideo zna już swoją długość. */
    const pendingSeek = useRef<number | 'last' | null>(null);

    const select = useCallback(
        (index: number, { seek = null as number | 'last' | null, skipIntro = false } = {}) => {
            const next = (index + scenes.length) % scenes.length;
            // Ta sama scena od nowa (np. „Wstecz" do animacji wstępnej): efekt na
            // zmianę `active` nie ruszy, więc nagranie cofamy tutaj.
            const same = videos.current[next];
            if (same && seek === null) same.currentTime = 0;
            setActive(next);
            setStarted((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
            setBeat(-1);
            setFocusOn(false);
            introElapsed.current = 0;
            setIntroProgress(0);
            pendingSeek.current = seek;
            setPhase(scenes[next]?.intro && !reduced.current && !skipIntro && seek === null ? 'intro' : 'video');
        },
        [scenes],
    );

    const canPlay = () => inView.current && !document.hidden && !reduced.current && !pausedRef.current;

    const playActive = useCallback(() => {
        const video = videos.current[active];
        if (!video) return;
        if (phaseRef.current === 'video' && canPlay()) void video.play().catch(() => {});
        else video.pause();
    }, [active]);

    useEffect(() => {
        reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced.current) setPhase('video');
    }, []);

    // Aktywne nagranie gra od początku (albo od kroku, do którego przeskoczono),
    // pozostałe stoją. Przy ograniczonym ruchu nic nie rusza samo: plakat jest
    // pełnoprawnym kadrem, a nagranie uruchamia dopiero świadome kliknięcie.
    useEffect(() => {
        videos.current.forEach((video, i) => {
            if (video && i !== active) video.pause();
        });
        const video = videos.current[active];
        if (video && pendingSeek.current === null) video.currentTime = 0;
        bars.current.forEach((bar, i) => {
            if (bar) bar.style.transform = `scaleX(${i < active ? 1 : 0})`;
        });
    }, [active]);

    useEffect(() => {
        playActive();
    }, [phase, paused, playActive]);

    useEffect(() => {
        const el = root.current;
        if (!el) return;
        const io = new IntersectionObserver(
            ([entry]) => {
                inView.current = (entry?.intersectionRatio ?? 0) > 0.2;
                playActive();
            },
            { threshold: [0, 0.2, 0.5] },
        );
        io.observe(el);
        document.addEventListener('visibilitychange', playActive);
        return () => {
            io.disconnect();
            document.removeEventListener('visibilitychange', playActive);
        };
    }, [playActive]);

    useEffect(() => {
        const scene = scenes[active];
        const intro = scene?.intro?.seconds ?? 0;
        const beats = scene?.beats ?? [];
        let raf = 0;
        let last = performance.now();
        let shownBeat = -2;
        let shownFocus: boolean | null = null;
        let shownIntro = -1;
        const tick = (now: number) => {
            raf = requestAnimationFrame(tick);
            const dt = Math.min(0.1, (now - last) / 1000);
            last = now;
            const video = videos.current[active];
            const bar = bars.current[active];

            if (phaseRef.current === 'intro') {
                if (canPlay()) introElapsed.current += dt;
                const p = Math.min(1, introElapsed.current / intro);
                const q = Math.round(p * 120) / 120;
                if (q !== shownIntro) {
                    shownIntro = q;
                    setIntroProgress(q);
                }
                const total = intro + (video?.duration || 20);
                if (bar) bar.style.transform = `scaleX(${introElapsed.current / total})`;
                if (p >= 1) setPhase('video');
                return;
            }

            if (!video || !video.duration) return;
            if (pendingSeek.current !== null) {
                const target = pendingSeek.current === 'last' ? (beats.at(-1)?.at ?? 0) : pendingSeek.current;
                video.currentTime = Math.min(video.duration - 0.05, target + 0.02);
                pendingSeek.current = null;
            }
            const t = video.currentTime;
            const total = intro + video.duration;
            if (bar) bar.style.transform = `scaleX(${Math.min(1, (intro + t) / total)})`;
            let b = -1;
            for (let i = 0; i < beats.length; i++) if ((beats[i]?.at ?? Infinity) <= t) b = i;
            if (b !== shownBeat) {
                shownBeat = b;
                setBeat(b);
            }
            const f = b >= 0 && t < (beats[b]?.until ?? 0);
            if (f !== shownFocus) {
                shownFocus = f;
                setFocusOn(f);
            }
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [active, scenes]);

    /** Kliknięcie sterowania przy ograniczonym ruchu to zgoda na ruch w tym jednym miejscu. */
    const consent = () => {
        reduced.current = false;
    };

    const seekTo = (t: number) => {
        const video = videos.current[active];
        if (video) video.currentTime = Math.max(0, t + 0.02);
    };

    const next = () => {
        consent();
        const beats = scenes[active]?.beats ?? [];
        if (phaseRef.current === 'intro') {
            setPhase('video');
            seekTo(0);
            return;
        }
        const target = beats[beat + 1];
        if (target) seekTo(target.at);
        else select(active + 1);
    };

    const prev = () => {
        consent();
        const scene = scenes[active];
        const beats = scene?.beats ?? [];
        if (phaseRef.current === 'intro' || beat <= 0) {
            // Pierwszy krok: wstecz do animacji wstępnej tej sceny, a jeśli jej nie ma
            // (albo już w niej jesteśmy) - do ostatniego kroku poprzedniej sceny.
            if (phaseRef.current === 'video' && scene?.intro) select(active);
            else select(active - 1, { seek: 'last' });
            return;
        }
        const target = beats[beat - 1];
        if (target) seekTo(target.at);
    };

    return {
        active,
        beat,
        focusOn,
        phase,
        introProgress,
        paused,
        select,
        next,
        prev,
        togglePause: () => {
            consent();
            setPaused((v) => !v);
        },
        choose: (index: number) => {
            consent();
            select(index);
        },
        root,
        started,
        videoRef: (i: number) => (el: HTMLVideoElement | null) => {
            videos.current[i] = el;
        },
        barRef: (i: number) => (el: HTMLSpanElement | null) => {
            bars.current[i] = el;
        },
    };
}

type Player = ReturnType<typeof useScenePlayer>;

export function SceneVideos({ scenes, player }: { scenes: readonly Scene[]; player: Player }) {
    const scene = scenes[player.active];
    const beats = scene?.beats ?? [];
    const beat = player.phase === 'video' ? beats[player.beat] : undefined;
    const focus = player.focusOn ? beat?.focus : undefined;
    return (
        <div ref={player.root} className="relative aspect-[16/10] overflow-hidden bg-[#0b0b0d]">
            <SceneCamera focus={focus} zoom={beat?.zoom}>
                {scenes.map((s, i) => (
                    <video
                        key={s.id}
                        ref={player.videoRef(i)}
                        className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-700 ease-out-expo ${
                            i === player.active && player.phase === 'video' ? 'opacity-100' : 'opacity-0'
                        }`}
                        poster={s.poster}
                        muted
                        playsInline
                        preload={player.started.has(i) ? 'auto' : 'none'}
                        onEnded={() => i === player.active && player.select(i + 1)}
                        aria-hidden={i !== player.active}
                        aria-label={`${s.title}. ${s.summary}`}
                    >
                        {player.started.has(i) && (
                            <>
                                <source src={`${s.video}.webm`} type='video/webm; codecs="vp9"' />
                                <source src={`${s.video}.mp4`} type="video/mp4" />
                            </>
                        )}
                    </video>
                ))}
                <FocusRing focus={focus} beatKey={`${player.active}-${player.beat}`} />
            </SceneCamera>
            {scene?.intro && player.phase === 'intro' && (
                <div className="absolute inset-0">{scene.intro.render(player.introProgress)}</div>
            )}
            {player.phase === 'video' && (
                <BeatCaption beat={beat} index={Math.max(0, player.beat)} total={beats.length} />
            )}
        </div>
    );
}

export function SceneTabs({ scenes, player }: { scenes: readonly Scene[]; player: Player }) {
    const current = scenes[player.active];
    return (
        <div>
            <div
                role="tablist"
                aria-label="Nagrania z aplikacji"
                className="grid gap-3 sm:gap-6"
                style={{ gridTemplateColumns: `repeat(${scenes.length}, minmax(0, 1fr))` }}
            >
                {scenes.map((scene, i) => {
                    const on = i === player.active;
                    return (
                        <button
                            key={scene.id}
                            type="button"
                            role="tab"
                            aria-selected={on}
                            aria-label={scene.title}
                            onClick={() => player.choose(i)}
                            className="group flex flex-col justify-start py-1 text-left"
                        >
                            <span className="relative block h-px overflow-hidden bg-line-strong">
                                <span
                                    ref={player.barRef(i)}
                                    className="absolute inset-0 origin-left scale-x-0 bg-[linear-gradient(90deg,var(--color-gold-200),var(--color-gold-400))]"
                                />
                            </span>
                            <span className="mt-3 flex items-baseline gap-2 sm:mt-4 sm:gap-2.5">
                                <span
                                    className={`font-mono text-[0.6875rem] tracking-[0.06em] tabular-nums transition-colors duration-300 ${
                                        on ? 'text-gold-200' : 'text-dim'
                                    }`}
                                >
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                {/* Na telefonie tytuły w kolumnach łamią się po słowie; zostaje
                                    numer, a tytuł aktywnego nagrania stoi pełną szerokością
                                    pod rzędem rozdziałów. */}
                                <span
                                    className={`hidden text-[0.875rem] leading-snug font-medium tracking-[-0.01em] text-balance transition-colors duration-300 sm:inline ${
                                        on ? 'text-paper' : 'text-dim group-hover:text-mute'
                                    }`}
                                >
                                    {scene.title}
                                </span>
                            </span>

                        </button>
                    );
                })}
            </div>
            {/* Opis tylko aktywnego nagrania, pełną szerokością: przy pięciu rozdziałach
                opisy w kolumnach zamieniały się w wąskie słupki tekstu. */}
            {current && (
                <div aria-live="polite" className="mt-5 max-w-[46rem] sm:mt-6">
                    <p className="text-[0.9375rem] font-medium tracking-[-0.01em] text-paper sm:hidden">{current.title}</p>
                    <p className="mt-1 text-[0.875rem] leading-[1.6] text-pretty text-mute sm:mt-0 sm:text-[0.9375rem]">{current.summary}</p>
                </div>
            )}
        </div>
    );
}

/**
 * Sterowanie odtwarzaczem: krok wstecz, pauza, krok dalej. Słowa zamiast ikon - jak
 * w całej stronie. Krok = fragment nagrania z jednym podpisem; „Dalej" na ostatnim
 * kroku przechodzi do następnego nagrania, „Wstecz" na pierwszym - do poprzedniego.
 */
export function SceneControls({ scenes, player }: { scenes: readonly Scene[]; player: Player }) {
    const scene = scenes[player.active];
    const beats = scene?.beats ?? [];
    const intro = player.phase === 'intro';
    const label = intro ? 'Animacja' : beats[player.beat]?.step ?? scene?.title ?? '';
    const count = intro ? '00' : String(Math.max(1, player.beat + 1)).padStart(2, '0');
    const btn =
        'inline-flex h-9 items-center justify-center rounded-[3px] border border-line-strong px-3.5 text-[0.8125rem] font-medium tracking-[-0.01em] text-paper transition-colors duration-150 hover:border-paper/40 hover:bg-white/[0.04] sm:px-4';
    return (
        <div role="group" aria-label="Sterowanie nagraniem" className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate font-mono text-[0.6875rem] tracking-[0.12em] text-dim uppercase" aria-live="polite">
                <span className="text-gold-200 tabular-nums">
                    {count}/{String(beats.length).padStart(2, '0')}
                </span>
                <span className="ml-2.5 hidden sm:inline">{label}</span>
            </p>
            <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={player.prev} className={btn}>
                    Wstecz
                </button>
                <button
                    type="button"
                    onClick={player.togglePause}
                    aria-pressed={player.paused}
                    className={`${btn} w-[6.5rem] ${player.paused ? 'border-gold-400/60 text-gold-50' : ''}`}
                >
                    {player.paused ? 'Odtwórz' : 'Pauza'}
                </button>
                <button type="button" onClick={player.next} className={btn}>
                    Dalej
                </button>
            </div>
        </div>
    );
}
