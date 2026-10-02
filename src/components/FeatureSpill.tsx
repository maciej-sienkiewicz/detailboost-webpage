import { motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

/** Skala napisu: 1 - drobny, 4 - plakatowy. */
export type WordSize = 1 | 2 | 3 | 4;

export type SpillWord = {
    text: string;
    size: WordSize;
    /** Obrys zamiast wypełnienia - dwa rodzaje liter robią fakturę „stosu". */
    outline?: boolean;
    /** Zostawia wielkość liter (KSeF), reszta idzie wersalikami. */
    keepCase?: boolean;
    /** Obrót w stopniach. ±90 = napis stoi pionowo. */
    r: number;
    /**
     * Miejsce od 1280 px: lewy albo prawy margines przy oknie, środek napisu
     * w procentach tej kolumny. x poza 0–100 = napis zachodzi na okno albo krawędź.
     */
    spot: { side: 'l' | 'r'; x: number; y: number };
    /** Kolejność na stosie pod oknem (telefon, tablet) - inna niż czytania, żeby był chaos. */
    pile: number;
};

export type WordState = 'idle' | 'scene' | 'current';

const SIZE: Record<WordSize, string> = {
    1: 'text-[1.0625rem] sm:text-[1.25rem] xl:text-[1.125rem] 2xl:text-[1.25rem]',
    2: 'text-[1.4375rem] sm:text-[1.75rem] xl:text-[1.5rem] 2xl:text-[1.75rem]',
    3: 'text-[1.875rem] sm:text-[2.375rem] xl:text-[2.125rem] 2xl:text-[2.5rem]',
    4: 'text-[2.625rem] sm:text-[3.375rem] xl:text-[3.25rem] 2xl:text-[3.75rem]',
};

/** Powtarzalny „los" z numeru napisu - ten sam rzut przy każdym wejściu na stronę. */
function rand(i: number, salt: number) {
    const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return v - Math.floor(v);
}

type Throw = { dx: number; dy: number };

/**
 * Napisy wysypane wokół okna aplikacji jak z wiaderka: wylatują z jednego punktu nad
 * oknem, lecą łukiem i lądują krzywo, z małym odbiciem. Każdy napis to krok jednego
 * z nagrań - kliknięcie przewija okno do tego kroku, a napis kroku, który właśnie
 * leci, świeci złotem. Napisy tej samej sceny jaśnieją o stopień, reszta leży szara.
 *
 * Tor lotu liczy się z prawdziwego położenia napisu względem okna (`origin`), dlatego
 * ten sam kod sypie i na marginesy przy oknie (od 1280 px), i na stos pod oknem.
 */
export function FeatureSpill({
    words,
    states,
    onPick,
    origin,
    layout,
    className = '',
}: {
    words: readonly SpillWord[];
    states: readonly WordState[];
    onPick: (index: number) => void;
    origin: RefObject<HTMLElement | null>;
    /** Stos pod oknem albo jeden z marginesów przy oknie (od 1280 px). */
    layout: 'pile' | 'l' | 'r';
    className?: string;
}) {
    const root = useRef<HTMLDivElement>(null);
    const anchors = useRef<(HTMLDivElement | null)[]>([]);
    const [throws, setThrows] = useState<readonly Throw[] | null>(null);
    const [still, setStill] = useState(false);

    useEffect(() => {
        const el = root.current;
        if (!el) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setStill(true);
            return;
        }
        const io = new IntersectionObserver(
            ([entry]) => {
                if (!entry?.isIntersecting) return;
                // display:none (inny układ niż bieżąca szerokość) też „przecina" ekran
                // z zerowym prostokątem - taki układ nie sypie.
                if (entry.boundingClientRect.width === 0) return;
                const box = origin.current?.getBoundingClientRect();
                if (!box) return;
                const ox = box.left + box.width / 2;
                const oy = box.top - Math.min(80, box.height * 0.12);
                setThrows(
                    anchors.current.map((a) => {
                        const r = a?.getBoundingClientRect();
                        if (!r) return { dx: 0, dy: 0 };
                        return { dx: ox - (r.left + r.width / 2), dy: oy - (r.top + r.height / 2) };
                    }),
                );
                io.disconnect();
            },
            { threshold: 0.15 },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [origin]);

    const pile = layout === 'pile';

    return (
        <div
            ref={root}
            role="group"
            aria-label="Funkcje na nagraniu"
            className={
                pile
                    ? `relative flex flex-wrap items-center justify-center gap-x-4 gap-y-2.5 px-2 sm:gap-x-7 sm:gap-y-3 ${className}`
                    : `relative ${className}`
            }
        >
            {words.map((word, i) => {
                if (!pile && word.spot.side !== layout) return null;
                // Na stosie napisy leżą płaściej: pion i ostre kąty rozsadzałyby wiersze.
                const r = pile ? Math.max(-11, Math.min(11, Math.abs(word.r) > 45 ? word.r / 9 : word.r * 0.8)) : word.r;
                return (
                    <div
                        key={word.text}
                        ref={(el) => {
                            anchors.current[i] = el;
                        }}
                        className={pile ? 'relative' : 'absolute -translate-x-1/2 -translate-y-1/2'}
                        style={
                            pile
                                ? { order: word.pile, marginTop: `${(rand(i, 3) - 0.5) * 0.5}rem` }
                                : { left: `${word.spot.x}%`, top: `${word.spot.y}%` }
                        }
                    >
                        <Toss index={i} r={r} toss={throws?.[i]} still={still}>
                            <Word word={word} r={r} state={states[i] ?? 'idle'} onPick={() => onPick(i)} />
                        </Toss>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Lot jednego napisu: rzut ukośny z punktu nad oknem. Pozycję liczymy w kilkunastu
 * próbkach (prawdziwa parabola, nie krzywa Béziera udająca łuk), potem dwa
 * malejące odbicia. Obrót wytraca się w locie jak u rzuconej kartki.
 */
function Toss({
    index,
    r,
    toss,
    still,
    children,
}: {
    index: number;
    r: number;
    toss?: Throw;
    still: boolean;
    children: ReactNode;
}) {
    if (still) return <div style={{ rotate: `${r}deg` }}>{children}</div>;
    if (!toss) return <div style={{ rotate: `${r}deg`, opacity: 0 }}>{children}</div>;

    const N = 14;
    const lift = 90 + rand(index, 1) * 140 + Math.max(0, -toss.dy) * 0.25;
    const spin = (rand(index, 2) > 0.5 ? 1 : -1) * (160 + rand(index, 4) * 260);
    const flight = 0.8;
    const ts: number[] = [];
    const xs: number[] = [];
    const ys: number[] = [];
    const rs: number[] = [];
    for (let k = 0; k <= N; k++) {
        const t = k / N;
        ts.push(t * flight);
        // Poziomo szybko na starcie i hamuje (opór), pionowo parabola.
        const h = 1 - Math.pow(1 - t, 1.6);
        xs.push(toss.dx * (1 - h));
        ys.push(toss.dy * (1 - t) - lift * 4 * t * (1 - t));
        rs.push(r + spin * Math.pow(1 - t, 2));
    }
    const bounce = 10 + rand(index, 5) * 10;
    ts.push(0.87, 0.93, 1);
    xs.push(0, 0, 0);
    ys.push(-bounce, 0, 0);
    rs.push(r + (rand(index, 6) - 0.5) * 8, r, r);

    const duration = 1.15 + rand(index, 7) * 0.35;
    const delay = 0.25 + index * 0.055 + rand(index, 8) * 0.08;

    return (
        <motion.div
            initial={{ opacity: 0, x: toss.dx, y: toss.dy, rotate: rs[0], scale: 0.55 }}
            animate={{ opacity: 1, x: xs, y: ys, rotate: rs, scale: 1 }}
            transition={{
                delay,
                duration,
                x: { delay, duration, times: ts, ease: 'linear' },
                y: { delay, duration, times: ts, ease: 'linear' },
                rotate: { delay, duration, times: ts, ease: 'linear' },
                opacity: { delay, duration: 0.18 },
                scale: { delay, duration: duration * flight, ease: [0.16, 1, 0.3, 1] },
            }}
        >
            {children}
        </motion.div>
    );
}

/**
 * Trzy stopnie światła: szary stos, jaśniejsze napisy bieżącego nagrania i złoty
 * napis kroku, który właśnie leci - ten jeszcze lekko się prostuje i rośnie, jakby
 * ktoś go podniósł ze stosu. Złoto to osobna warstwa nad literami, przenikana
 * przezroczystością: gradientu w `background-clip: text` nie da się płynnie zmienić.
 */
function Word({
    word,
    r,
    state,
    onPick,
}: {
    word: SpillWord;
    r: number;
    state: WordState;
    onPick: () => void;
}) {
    const current = state === 'current';
    const lift = Math.abs(r) < 45 ? -r * 0.4 : 0;
    const ink = word.outline
        ? {
              idle: 'text-transparent [-webkit-text-stroke:1px_rgb(255_255_255/0.30)] group-hover:[-webkit-text-stroke:1px_rgb(244_244_242/0.85)]',
              scene: 'text-transparent [-webkit-text-stroke:1px_rgb(244_244_242/0.75)] group-hover:[-webkit-text-stroke:1px_rgb(244_244_242/1)]',
              current: 'text-transparent [-webkit-text-stroke:1px_transparent]',
          }[state]
        : {
              idle: 'text-white/[0.16] group-hover:text-white/70',
              scene: 'text-paper/60 group-hover:text-paper/90',
              current: 'text-transparent',
          }[state];

    return (
        <button
            type="button"
            onClick={onPick}
            aria-pressed={current}
            className={`group relative block cursor-pointer px-1.5 py-0.5 font-display leading-[0.92] font-[820] tracking-[-0.025em] whitespace-nowrap [font-stretch:76%] transition-transform duration-700 ease-out-expo ${
                word.keepCase ? '' : 'uppercase'
            } ${SIZE[word.size]}`}
            style={{ transform: current ? `rotate(${lift}deg) scale(1.1)` : undefined, zIndex: current ? 1 : undefined }}
        >
            <span className={`block [transition-property:color,-webkit-text-stroke] duration-500 ${ink}`}>{word.text}</span>
            <span
                aria-hidden
                className={`text-fill-gold pointer-events-none absolute inset-0 px-1.5 py-0.5 [filter:drop-shadow(0_0_22px_rgb(220_174_92/0.45))] transition-opacity duration-500 ${
                    current ? 'opacity-100' : 'opacity-0'
                }`}
            >
                {word.text}
            </span>
        </button>
    );
}
