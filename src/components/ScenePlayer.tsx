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
        /**
         * Skok do chwili w nagraniu (napis wokół okna). Bez `at` - nagranie od początku,
         * razem z animacją wstępną. Kliknięcie to prośba o ruch, więc zdejmuje pauzę.
         */
        jump: (index: number, at?: number) => {
            consent();
            setPaused(false);
            select(index, { seek: at ?? null });
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

/**
 * Pasek pod oknem: linia czasu i sterowanie, nic więcej. Co dzieje się na nagraniu,
 * mówi podpis w oknie, a co system umie - napisy wokół okna; tu nie powtarzamy
 * żadnego z nich.
 *
 * Linia czasu to po jednym cienkim odcinku na nagranie. Bieżący wypełnia się złotem
 * (pasek postępu idzie wprost do DOM, patrz `barRef`), obejrzane stoją pełne.
 * Tytuł nagrania pokazuje się nad odcinkiem po najechaniu, a pod linią stoi tytuł
 * tego, które leci. Sterowanie to jedna grupa trzech słów - jak w pasku nawigacji.
 */
export function SceneBar({ scenes, player }: { scenes: readonly Scene[]; player: Player }) {
    const scene = scenes[player.active];
    const btn =
        'inline-flex h-8 items-center justify-center rounded-md px-3 text-[0.8125rem] font-medium text-white/70 transition-colors duration-200 hover:bg-white/[0.07] hover:text-white';
    return (
        <div className="font-ui">
            <div role="tablist" aria-label="Nagrania z aplikacji" className="flex gap-1.5">
                {scenes.map((s, i) => {
                    const on = i === player.active;
                    return (
                        <button
                            key={s.id}
                            type="button"
                            role="tab"
                            aria-selected={on}
                            aria-label={s.title}
                            onClick={() => player.choose(i)}
                            className="group relative flex-1 py-3"
                        >
                            <span
                                className={`relative block h-[3px] overflow-hidden rounded-full transition-colors duration-200 ${
                                    on ? 'bg-white/[0.16]' : 'bg-white/[0.1] group-hover:bg-white/[0.22]'
                                }`}
                            >
                                {/* Skala przez `transform`, nie klasę `scale-x-0`: Tailwind 4 ustawia
                                    nią osobną właściwość `scale`, która zeruje pasek niezależnie
                                    od `transform` wpisywanego przez odtwarzacz. */}
                                <span
                                    ref={player.barRef(i)}
                                    style={{ transform: 'scaleX(0)' }}
                                    className="absolute inset-0 origin-left bg-[linear-gradient(90deg,var(--color-gold-200),var(--color-gold-400))]"
                                />
                            </span>
                            <span
                                aria-hidden
                                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 translate-y-1 rounded-md border border-white/[0.1] bg-[#141416] px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white/85 opacity-0 shadow-[0_8px_24px_-8px_rgb(0_0_0/0.6)] transition-[opacity,transform] duration-200 group-hover:translate-y-0 group-hover:opacity-100 sm:block"
                            >
                                {s.title}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <p aria-live="polite" className="flex min-w-0 items-baseline gap-3">
                    <span className="font-mono text-[0.6875rem] text-dim tabular-nums">
                        {String(player.active + 1).padStart(2, '0')}/{String(scenes.length).padStart(2, '0')}
                    </span>
                    <span className="truncate text-[0.9375rem] font-medium tracking-[-0.01em] text-white/90">
                        {scene?.title}
                    </span>
                </p>
                <div
                    role="group"
                    aria-label="Sterowanie nagraniem"
                    className="inline-flex shrink-0 self-start rounded-lg border border-white/[0.1] bg-white/[0.03] p-0.5 sm:self-auto"
                >
                    <button type="button" onClick={player.prev} className={btn}>
                        Wstecz
                    </button>
                    <button
                        type="button"
                        onClick={player.togglePause}
                        aria-pressed={player.paused}
                        className={`${btn} w-[4.75rem] ${player.paused ? 'bg-white/[0.07] text-white' : ''}`}
                    >
                        {player.paused ? 'Odtwórz' : 'Pauza'}
                    </button>
                    <button type="button" onClick={player.next} className={btn}>
                        Dalej
                    </button>
                </div>
            </div>
        </div>
    );
}
