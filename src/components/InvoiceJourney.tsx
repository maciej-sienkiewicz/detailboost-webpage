/**
 * Animacja przed nagraniem kosztów: to, czego nie da się nagrać w CRM, bo dzieje się
 * u kogoś innego. Kontrahent wystawia fakturę, ta trafia do KSeF i dostaje numer,
 * CRM ją pobiera, a reguła po NIP dostawcy przypisuje ją do kategorii.
 *
 * Sterowana postępem 0–1 z odtwarzacza, nie własnym zegarem: pauza odtwarzacza
 * (okno poza ekranem, karta w tle) zatrzymuje ją w tym samym miejscu. Wszystkie
 * wymiary w jednostkach kontenera (cqw), więc kadr skaluje się razem z oknem.
 *
 * Dane z nagrania (capture/seed.mjs: NEW_COST_INVOICE, SUPPLIERS.ppf) - animacja
 * opowiada dokładnie tę fakturę, którą potem widać w CRM. Dostawca jest fikcyjny.
 */
const SUPPLIER = 'PPF Protect Dystrybucja Sp. z o.o.';
const NIP = '712-506-38-56';
const NUMBER = 'FV/PP/2026/0915';
const ITEMS = [
    ['Folia PPF bezbarwna 152 cm × 15,24 m', '1 rolka'],
    ['Płyn montażowy do folii 1 l', '2 szt.'],
] as const;
const TOTAL = '8 693,64 zł';
const CATEGORY = 'Folie PPF';

// Uwaga: Tailwind 4 robi `-translate-x-1/2` osobną właściwością `translate`, która
// SKŁADA się z inline `transform: translate(-50%)` - elementy z ruchem w stylu
// inline nie mogą mieć tej klasy, inaczej przesuwają się o całą szerokość.

/** Odcinek [a, b] postępu → 0–1 z łagodnym wejściem i wyjściem. */
const seg = (p: number, a: number, b: number) => {
    const t = Math.min(1, Math.max(0, (p - a) / (b - a)));
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export function InvoiceJourney({ progress: p }: { progress: number }) {
    const appear = seg(p, 0, 0.12);
    const lines = seg(p, 0.06, 0.22);
    const toKsef = seg(p, 0.26, 0.42);
    const stamp = seg(p, 0.42, 0.5);
    const toCrm = seg(p, 0.56, 0.72);
    const rule = seg(p, 0.72, 0.8);
    const chip = seg(p, 0.78, 0.86);
    const out = seg(p, 0.94, 1);

    // Karta faktury jedzie po linii: kontrahent (20%) → KSeF (50%) → CRM (80%).
    const cardX = 20 + 30 * toKsef + 30 * toCrm;
    const cardScale = 1 - 0.12 * Math.min(1, toKsef + toCrm);

    return (
        <div
            className="absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_50%_40%,#17171c,#0b0b0d_70%)] [container-type:inline-size]"
            style={{ opacity: 1 - out }}
            aria-label={`Kontrahent ${SUPPLIER} wystawia fakturę ${NUMBER}, faktura trafia do KSeF, CRM pobiera ją i przypisuje do kategorii ${CATEGORY}.`}
            role="img"
        >
            {/* Siatka - ten sam język co tło strony. */}
            <div className="absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgb(255_255_255/0.12)_1px,transparent_1px)] [background-size:2.2cqw_2.2cqw]" />

            {/* Tor: linia z biegnącym światłem. */}
            <div className="absolute top-[56%] right-[20%] left-[20%] h-px bg-white/10">
                <div
                    className="absolute inset-y-0 left-0 bg-[linear-gradient(90deg,var(--color-gold-600),var(--color-gold-200))]"
                    style={{ width: `${50 * toKsef + 50 * toCrm}%` }}
                />
            </div>

            <Dot x={20} on={appear} lit={appear} />
            <Dot x={50} on={seg(p, 0.2, 0.3)} lit={stamp} />
            <Dot x={80} on={seg(p, 0.46, 0.56)} lit={chip} />

            <Node x={20} label="Kontrahent" title={SUPPLIER} sub={`NIP ${NIP}`} on={appear} />
            <Node x={50} label="KSeF" title="Krajowy System e-Faktur" sub="Ministerstwo Finansów" on={seg(p, 0.2, 0.3)} lit={stamp} />
            <Node x={80} label="DetailBoost" title="Faktury kosztowe" sub="Pobranie z KSeF co 15 minut" on={seg(p, 0.46, 0.56)} lit={chip} />

            {/* Faktura. */}
            <div
                className="absolute top-[56%] w-[31cqw] rounded-[0.9cqw] border border-white/12 bg-[#f6f6f4] p-[1.8cqw] text-[#16161a] shadow-[0_2cqw_4cqw_-1cqw_rgb(0_0_0/0.7)]"
                style={{
                    left: `${cardX}%`,
                    transform: `translate(-50%, -50%) scale(${cardScale * (0.92 + 0.08 * appear)})`,
                    opacity: appear,
                }}
            >
                <div className="flex items-baseline justify-between gap-[1cqw]">
                    <span className="font-mono text-[1.05cqw] tracking-[0.12em] text-[#71717a] uppercase">Faktura VAT</span>
                    <span className="font-mono text-[1.15cqw] tabular-nums">{NUMBER}</span>
                </div>
                <div className="mt-[0.6cqw] truncate text-[1.6cqw] font-semibold tracking-[-0.02em]">{SUPPLIER}</div>
                <div className="mt-[1.1cqw] space-y-[0.6cqw] border-t border-black/10 pt-[1cqw]">
                    {ITEMS.map(([name, qty], i) => (
                        <div
                            key={name}
                            className="flex justify-between gap-[1.2cqw] text-[1.25cqw]"
                            style={{ opacity: seg(lines, i * 0.35, i * 0.35 + 0.5), transform: `translateY(${(1 - seg(lines, i * 0.35, i * 0.35 + 0.5)) * 0.4}cqw)` }}
                        >
                            <span className="truncate">{name}</span>
                            <span className="shrink-0 text-[#71717a] tabular-nums">{qty}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-[1.1cqw] flex items-baseline justify-between border-t border-black/10 pt-[0.9cqw]" style={{ opacity: seg(lines, 0.6, 1) }}>
                    <span className="text-[1.2cqw] text-[#71717a]">Do zapłaty</span>
                    <span className="text-[1.9cqw] font-semibold tabular-nums">{TOTAL}</span>
                </div>
                {/* Pieczęć KSeF: numer nadany przy przyjęciu. */}
                <div
                    className="mt-[1cqw] flex items-center justify-between gap-[1cqw] rounded-[0.5cqw] bg-[#ecfdf3] px-[1cqw] py-[0.6cqw] text-[1.1cqw] text-[#15803d]"
                    style={{ opacity: stamp, transform: `scale(${1.15 - 0.15 * stamp})` }}
                >
                    <span className="font-medium">Przyjęta w KSeF</span>
                    <span className="truncate font-mono tabular-nums">7125063856-20261002-…</span>
                </div>
                {/* Kategoria z reguły. */}
                <div
                    className="mt-[0.8cqw] flex items-center gap-[0.8cqw] text-[1.2cqw]"
                    style={{ opacity: chip, transform: `translateY(${(1 - chip) * 0.5}cqw)` }}
                >
                    <span className="h-[1cqw] w-[1cqw] shrink-0 rounded-full bg-[#8B5CF6]" />
                    <span className="font-medium">{CATEGORY}</span>
                    <span className="text-[#71717a]">przypisana automatycznie</span>
                </div>
            </div>

            {/* Reguła dopasowania - podpis pod węzłem CRM. */}
            <div
                className="absolute top-[83%] left-[80%] w-[34cqw] rounded-[0.7cqw] border border-gold-400/30 bg-black/50 px-[1.4cqw] py-[0.9cqw] text-center backdrop-blur"
                style={{ opacity: rule, transform: `translate(-50%, ${(1 - rule) * 0.8}cqw)` }}
            >
                <div className="font-mono text-[1.05cqw] tracking-[0.14em] text-gold-200 uppercase">Reguła dopasowania</div>
                <div className="mt-[0.4cqw] text-[1.45cqw] text-paper">
                    NIP {NIP} <span className="text-mute">→</span> {CATEGORY}
                </div>
            </div>
        </div>
    );
}

function Node({ x, label, title, sub, on, lit = 0 }: { x: number; label: string; title: string; sub: string; on: number; lit?: number }) {
    // Węzeł to sam podpis nad torem; punkt na torze rysuje `Dot`.
    return (
        <div
            className="absolute top-[9%] w-[27cqw] text-center"
            style={{ left: `${x}%`, opacity: on, transform: `translate(-50%, ${(1 - on) * 1}cqw)` }}
        >
            <div className="font-mono text-[1.1cqw] tracking-[0.2em] uppercase" style={{ color: lit > 0.5 ? 'var(--color-gold-200)' : 'var(--color-mute)' }}>
                {label}
            </div>
            <div className="mt-[0.6cqw] text-[1.9cqw] leading-[1.15] font-semibold tracking-[-0.025em] text-balance text-paper">{title}</div>
            <div className="mt-[0.5cqw] text-[1.25cqw] text-dim">{sub}</div>
        </div>
    );
}

/** Punkt węzła na torze - zapala się, gdy faktura do niego dociera. */
function Dot({ x, on, lit = 0 }: { x: number; on: number; lit?: number }) {
    return (
        <div
            className="absolute top-[56%] h-[1.5cqw] w-[1.5cqw] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-[#0b0b0d]"
            style={{
                left: `${x}%`,
                opacity: on,
                background: lit > 0 ? `rgb(220 174 92 / ${0.25 + 0.75 * lit})` : undefined,
                boxShadow: lit > 0 ? `0 0 ${2.5 * lit}cqw rgb(220 174 92 / ${0.6 * lit})` : 'none',
            }}
        />
    );
}
