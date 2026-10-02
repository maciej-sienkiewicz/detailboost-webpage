import { useCallback, useEffect, useRef, useState } from 'react';

export type Scene = {
    id: string;
    title: string;
    /** Jedno zdanie: co widać na nagraniu. Czytane razem z tytułem przez czytnik ekranu. */
    summary: string;
    poster: string;
    /** Ścieżka bez rozszerzenia: obok leżą `.webm` (VP9) i `.mp4` (H.264). */
    video: string;
};

/**
 * Trzy nagrania z działającego CRM, odtwarzane po kolei, z rozdziałami pod oknem.
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
 * a obie części dostają go osobno. Pasek postępu dostaje szerokość wprost
 * z `currentTime`, poza Reactem: stan aktualizowany 60 razy na sekundę
 * przerysowywałby całe Hero.
 */
export function useScenePlayer(scenes: readonly Scene[]) {
    const [active, setActive] = useState(0);
    const [started, setStarted] = useState<ReadonlySet<number>>(() => new Set([0]));
    const videos = useRef<(HTMLVideoElement | null)[]>([]);
    const bars = useRef<(HTMLSpanElement | null)[]>([]);
    const root = useRef<HTMLDivElement>(null);
    const inView = useRef(false);
    const reduced = useRef(false);

    const select = useCallback(
        (index: number) => {
            const next = (index + scenes.length) % scenes.length;
            setActive(next);
            setStarted((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
        },
        [scenes.length],
    );

    const playActive = useCallback(() => {
        const video = videos.current[active];
        if (!video) return;
        if (inView.current && !document.hidden && !reduced.current) void video.play().catch(() => {});
        else video.pause();
    }, [active]);

    useEffect(() => {
        reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }, []);

    // Aktywne nagranie gra od początku, pozostałe stoją. Przy ograniczonym ruchu nic
    // nie rusza samo: plakat jest pełnoprawnym kadrem, a nagranie uruchamia dopiero
    // świadome kliknięcie rozdziału.
    useEffect(() => {
        videos.current.forEach((video, i) => {
            if (!video || i === active) return;
            video.pause();
        });
        const video = videos.current[active];
        if (video) {
            video.currentTime = 0;
            playActive();
        }
        bars.current.forEach((bar, i) => {
            if (bar) bar.style.transform = `scaleX(${i < active ? 1 : 0})`;
        });
    }, [active, playActive]);

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
        let raf = 0;
        const tick = () => {
            raf = requestAnimationFrame(tick);
            const video = videos.current[active];
            const bar = bars.current[active];
            if (!video || !bar || !video.duration) return;
            bar.style.transform = `scaleX(${Math.min(1, video.currentTime / video.duration)})`;
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [active]);

    return {
        active,
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
    return (
        <div ref={player.root} className="relative aspect-[16/10] bg-[#0b0b0d]">
            {scenes.map((scene, i) => (
                <video
                    key={scene.id}
                    ref={player.videoRef(i)}
                    className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-700 ease-out-expo ${
                        i === player.active ? 'opacity-100' : 'opacity-0'
                    }`}
                    poster={scene.poster}
                    muted
                    playsInline
                    preload={player.started.has(i) ? 'auto' : 'none'}
                    onEnded={() => i === player.active && player.select(i + 1)}
                    aria-hidden={i !== player.active}
                    aria-label={`${scene.title}. ${scene.summary}`}
                >
                    {player.started.has(i) && (
                        <>
                            <source src={`${scene.video}.webm`} type='video/webm; codecs="vp9"' />
                            <source src={`${scene.video}.mp4`} type="video/mp4" />
                        </>
                    )}
                </video>
            ))}
        </div>
    );
}

export function SceneTabs({ scenes, player }: { scenes: readonly Scene[]; player: Player }) {
    const current = scenes[player.active];
    return (
        <div>
            <div role="tablist" aria-label="Nagrania z aplikacji" className="grid grid-cols-3 gap-3 sm:gap-6">
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
                                {/* Na telefonie trzy tytuły w trzech kolumnach łamią się po
                                    słowie; zostaje numer, a tytuł aktywnego nagrania stoi
                                    pełną szerokością pod rzędem rozdziałów. */}
                                <span
                                    className={`hidden text-[0.9375rem] leading-snug font-medium tracking-[-0.01em] text-balance transition-colors duration-300 sm:inline ${
                                        on ? 'text-paper' : 'text-dim group-hover:text-mute'
                                    }`}
                                >
                                    {scene.title}
                                </span>
                            </span>
                            <span
                                className={`mt-1.5 hidden pl-[1.65rem] text-[0.8125rem] leading-[1.55] text-pretty transition-colors duration-300 md:block ${
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
