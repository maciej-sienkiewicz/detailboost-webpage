import { container, sectionKicker, sectionTitle } from './ui';

/*
 * Każdy punkt odpowiada temu, co robi moduł KSeF w backendzie CRM (pl.detailing.crm.ksef):
 * faktura FA(3) z pozycji wizyty, wysyłka i UPO, kod QR weryfikacji, korekty, kolejka
 * offline24 z automatycznym dosłaniem, pobieranie faktur kosztowych co 15 minut
 * i przypisanie kategorii regułą po NIP. Czego moduł nie robi, tego tu nie ma.
 */
const SALES = [
    'Faktura VAT z pozycji wizyty, w schemacie FA(3)',
    'Wysyłka do KSeF jednym kliknięciem przy wydaniu auta',
    'Numer KSeF i UPO wracają do faktury same',
    'Kod QR weryfikacji na fakturze dla klienta',
    'Korekty faktur wystawione w KSeF',
    'Gdy KSeF nie działa: faktura czeka w kolejce i dosyła się sama (offline24)',
] as const;

const COSTS = [
    'Faktury od dostawców pobierane z KSeF co 15 minut',
    'Reguła po NIP dostawcy przypisuje kategorię kosztu',
    'Koszty w kategoriach: chemia, folie, paliwo, leasing',
    'Statystyki kosztów w wybranym okresie',
] as const;

export function KsefSection({ onShow }: { onShow: (scene: string, beat?: string) => void }) {
    return (
        <section id="ksef" aria-labelledby="ksef-title" className="scroll-mt-24 border-y border-white/[0.06] bg-white/[0.015]">
            <div className={container}>
                <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
                    <div className="lg:col-span-5">
                        <p className={sectionKicker}>KSeF</p>
                        <h2 id="ksef-title" className={`mt-4 ${sectionTitle}`}>
                            <span className="normal-case">KSeF</span> bez przepisywania<span className="text-gold-400">.</span>
                        </h2>
                        <p className="mt-6 max-w-[30rem] text-[1.0625rem] leading-[1.6] text-pretty text-mute">
                            Faktura powstaje z wizyty, którą już masz w systemie, i sama idzie do KSeF.
                            Faktury od dostawców przychodzą z KSeF bez Twojego udziału.
                        </p>
                        <p className="mt-6 max-w-[30rem] border-l border-gold-400/60 pl-4 text-[0.9375rem] leading-[1.6] text-white/75">
                            Od 1 stycznia 2027 r. kończy się okres przejściowy bez kar za błędy w KSeF.
                        </p>
                    </div>

                    <div className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2 lg:col-span-7">
                        <KsefColumn title="Sprzedaż" items={SALES} action="Zobacz wysyłkę do KSeF" onClick={() => onShow('handover', 'ksef')} />
                        <KsefColumn title="Koszty" items={COSTS} action="Zobacz koszty z KSeF" onClick={() => onShow('costs')} />
                    </div>
                </div>
                <p className="mt-8 font-ui text-[0.8125rem] text-dim">
                    KSeF jest w planie FULL albo w module „Kontrola nad finansami” do planu BASIC.
                </p>
            </div>
        </section>
    );
}

function KsefColumn({
    title,
    items,
    action,
    onClick,
}: {
    title: string;
    items: readonly string[];
    action: string;
    onClick: () => void;
}) {
    return (
        <div className="flex flex-col bg-void p-6 sm:p-8">
            <h3 className="font-ui text-[1.0625rem] font-semibold tracking-[-0.015em] text-paper">{title}</h3>
            <ul className="mt-5 flex flex-1 flex-col gap-3.5">
                {items.map((item) => (
                    <li key={item} className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-2 text-[0.9375rem] leading-[1.5] text-mute">
                        <span aria-hidden className="mt-[0.6em] h-px w-2 bg-gold-400" />
                        {item}
                    </li>
                ))}
            </ul>
            <button
                type="button"
                onClick={onClick}
                className="group mt-7 inline-flex w-fit font-ui text-[0.875rem] font-medium text-white/80 transition-colors duration-200 hover:text-white"
            >
                <span className="border-b border-white/20 pb-0.5 transition-colors duration-200 group-hover:border-gold-400">{action}</span>
            </button>
        </div>
    );
}
