import { container, sectionKicker, sectionTitle } from './ui';

type Benefit = {
    /** Sytuacja ze studia, słowami właściciela. */
    problem: string;
    /** Co robi system - tylko to, co widać na nagraniu, do którego prowadzi przycisk. */
    answer: string;
    scene: string;
    beat?: string;
};

/*
 * Sytuacje, nie funkcje: nazwy funkcji leżą już wokół okna. Tu każda karta mówi, jaki
 * kłopot znika, i prowadzi do kroku nagrania, który to pokazuje - obietnica jest
 * sprawdzalna jednym kliknięciem.
 */
const BENEFITS: readonly Benefit[] = [
    {
        problem: 'Klient pisze, a Ty jesteś przy aucie.',
        answer: 'Zapytanie z maila trafia do systemu razem z historią klienta i propozycją usług z cennika. Odpowiadasz z tej samej rozmowy.',
        scene: 'lead',
        beat: 'suggested',
    },
    {
        problem: 'Klient nie przyjechał na termin.',
        answer: 'Potwierdzenie SMS idzie od razu po rezerwacji, a przypomnienie dzień przed wizytą. Bez dzwonienia.',
        scene: 'lead',
        beat: 'sms',
    },
    {
        problem: 'Spór o rysę przy odbiorze.',
        answer: 'Przyjęcie na tablecie: zdjęcia z telefonu przez kod QR, mapa uszkodzeń i protokół podpisany przez klienta.',
        scene: 'checkin',
        beat: 'damage',
    },
    {
        problem: 'Dosprzedaż wymaga telefonu.',
        answer: 'Klient dostaje SMS-em stronę swojej wizyty z propozycją usługi. Odpisuje „TAK” i usługa sama trafia do wizyty.',
        scene: 'visitcard',
        beat: 'offer',
    },
    {
        problem: 'Papiery na koniec dnia.',
        answer: 'Faktura do KSeF z gotowej wizyty, bez przepisywania. Faktury kosztowe pobierają się same i trafiają do kategorii.',
        scene: 'handover',
        beat: 'invoice',
    },
    {
        problem: 'Kto ile pracował w tym miesiącu.',
        answer: 'Pracownicy wpisują godziny sami, Ty zatwierdzasz kartę jednym kliknięciem i drukujesz listę obecności w PDF.',
        scene: 'team',
        beat: 'worktime',
    },
];

export function Benefits({ onShow }: { onShow: (scene: string, beat?: string) => void }) {
    return (
        <section id="funkcje" aria-labelledby="funkcje-title" className="scroll-mt-24">
            <div className={container}>
                <p className={sectionKicker}>Funkcje</p>
                <h2 id="funkcje-title" className={`mt-4 max-w-[48rem] ${sectionTitle}`}>
                    Sześć kłopotów, które znikają<span className="text-gold-400">.</span>
                </h2>

                <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] sm:mt-16 md:grid-cols-2 xl:grid-cols-3">
                    {BENEFITS.map((b, i) => (
                        <li key={b.problem} className="flex flex-col bg-void p-6 sm:p-8">
                            <span className="font-mono text-[0.6875rem] text-dim tabular-nums">
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            <h3 className="mt-5 font-ui text-[1.1875rem] leading-snug font-semibold tracking-[-0.02em] text-paper">
                                {b.problem}
                            </h3>
                            <p className="mt-3 text-[0.9375rem] leading-[1.6] text-pretty text-mute">{b.answer}</p>
                            <button
                                type="button"
                                onClick={() => onShow(b.scene, b.beat)}
                                className="group mt-auto inline-flex w-fit items-center gap-2 pt-7 font-ui text-[0.875rem] font-medium text-white/80 transition-colors duration-200 hover:text-white"
                            >
                                <span className="border-b border-white/20 pb-0.5 transition-colors duration-200 group-hover:border-gold-400">
                                    Zobacz na nagraniu
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
