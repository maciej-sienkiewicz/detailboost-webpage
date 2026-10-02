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
    const [phase, setPhase] = useState<'intro' | 'video'>(() => (scenes[0]?.intro ? 'intro' : 'video'));
    const [introProgress, setIntroProgress] = useState(0);
    const videos = useRef<(HTMLVideoElement | null)[]>([]);
    const bars = useRef<(HTMLSpanElement | null)[]>([]);
    const root = useRef<HTMLDivElement>(null);
    const inView = useRef(false);
    const reduced = useRef(false);
    const introElapsed = useRef(0);
    const phaseRef = useRef(phase);
    phaseRef.current = phase;

    const select = useCallback(
        (index: number) => {
            const next = (index + scenes.length) % scenes.length;
            setActive(next);
            setStarted((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
            setBeat(-1);
            introElapsed.current = 0;
            setIntroProgress(0);
            setPhase(scenes[next]?.intro && !reduced.current ? 'intro' : 'video');
        },
        [scenes],
    );

    const canPlay = () => inView.current && !document.hidden && !reduced.current;

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

    // Aktywne nagranie gra od początku, pozostałe stoją. Przy ograniczonym ruchu nic
    // nie rusza samo: plakat jest pełnoprawnym kadrem, a nagranie uruchamia dopiero
    // świadome kliknięcie rozdziału.
    useEffect(() => {
        videos.current.forEach((video, i) => {
            if (video && i !== active) video.pause();
        });
        const video = videos.current[active];
        if (video) video.currentTime = 0;
        bars.current.forEach((bar, i) => {
            if (bar) bar.style.transform = `scaleX(${i < active ? 1 : 0})`;
        });
    }, [active]);

    useEffect(() => {
        playActive();
    }, [phase, playActive]);

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
        let shownBeat = -1;
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
            const total = intro + video.duration;
            if (bar) bar.style.transform = `scaleX(${Math.min(1, (intro + video.currentTime) / total)})`;
            let b = -1;
            for (let i = 0; i < beats.length; i++) if ((beats[i]?.at ?? Infinity) <= video.currentTime) b = i;
            if (b !== shownBeat) {
                shownBeat = b;
                setBeat(b);
            }
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [active, scenes]);

    return {
        active,
        beat,
        phase,
        introProgress,
        select,
        /** Kliknięcie rozdziału przy ograniczonym ruchu to zgoda na ruch w tym jednym miejscu. */
        choose: (index: number) => {
            reduced.current = false;
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
    return (
        <div ref={player.root} className="relative aspect-[16/10] overflow-hidden bg-[#0b0b0d]">
            <SceneCamera focus={beat?.focus} zoom={beat?.zoom}>
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
                <FocusRing focus={beat?.focus} beatKey={`${player.active}-${player.beat}`} />
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
                            <span
                                className={`mt-1.5 hidden pl-[1.65rem] text-[0.8125rem] leading-[1.55] text-pretty transition-colors duration-300 lg:block ${
                                    on ? 'text-mute' : 'text-dim/70'
                                }`}
                            >
                                {scene.summary}
                            </span>
                        </button>
                    );
                })}
            </div>
            {current && (
                <div aria-live="polite" className="mt-4 sm:hidden">
                    <p className="text-[0.9375rem] font-medium tracking-[-0.01em] text-paper">{current.title}</p>
                    <p className="mt-1 text-[0.8125rem] leading-[1.55] text-pretty text-mute">{current.summary}</p>
                </div>
            )}
        </div>
    );
}
