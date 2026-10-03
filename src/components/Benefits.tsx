import { container, sectionKicker, sectionTitle } from './ui';

type Benefit = {
    /** Jak jest dziś - słowami właściciela studia, nie mechanika przy aucie. */
    today: string;
    /** Co się zmienia: krótko, do przeczytania w przelocie. */
    change: string;
    /** Jak to działa - tylko to, co widać na nagraniu, do którego prowadzi przycisk. */
    how: string;
    scene: string;
    beat?: string;
};

/*
 * Każda karta ma dwa podpisane piętra: „Dziś" (kłopot, przygaszony) i „Z DetailBoost"
 * (zmiana, jasna). Bez podpisów karta czytała się jak dwa niezwiązane zdania - nie było
 * widać, że drugie odpowiada na pierwsze. Przycisk prowadzi do kroku nagrania, który
 * to pokazuje, więc obietnica jest sprawdzalna jednym kliknięciem.
 */
const BENEFITS: readonly Benefit[] = [
    {
        today: 'Zapytanie przychodzi mailem, a wycena powstaje dopiero wieczorem.',
        change: 'Zapytanie od razu z historią klienta i wyceną',
        how: 'System podsuwa usługi z cennika z cenami i pokazuje wcześniejsze wizyty klienta. Odpowiedź wychodzi z firmowej skrzynki studia.',
        scene: 'lead',
        beat: 'suggested',
    },
    {
        today: 'Klient zapomina o terminie, a stanowisko stoi puste.',
        change: 'Przypomnienia wysyłają się same',
        how: 'Potwierdzenie SMS zaraz po rezerwacji i przypomnienie 24 godziny przed wizytą.',
        scene: 'lead',
        beat: 'sms',
    },
    {
        today: 'Przy odbiorze klient twierdzi, że rysy wcześniej nie było.',
        change: 'Stan auta udokumentowany przy przyjęciu',
        how: 'Zdjęcia z telefonu przez kod QR, mapa uszkodzeń i protokół podpisany przez klienta na tablecie.',
        scene: 'checkin',
        beat: 'damage',
    },
    {
        today: 'Propozycję dodatkowej usługi trzeba przedzwonić, a klient nie odbiera.',
        change: 'Klient akceptuje usługę SMS-em',
        how: 'Dostaje link do strony swojej wizyty z propozycją i ceną. Odpisuje „TAK” i usługa trafia do wizyty.',
        scene: 'visitcard',
        beat: 'offer',
    },
    {
        today: 'Faktury wystawiane po godzinach i przepisywane ręcznie.',
        change: 'Faktura z wizyty, wysłana do KSeF',
        how: 'Faktura powstaje z pozycji wizyty i idzie do KSeF jednym kliknięciem. Faktury kosztowe pobierają się z KSeF same.',
        scene: 'handover',
        beat: 'invoice',
    },
    {
        today: 'Godziny zespołu w zeszycie, lista obecności sklejana na koniec miesiąca.',
        change: 'Czas pracy zespołu w jednym miejscu',
        how: 'Pracownicy wpisują godziny sami, Ty zatwierdzasz kartę jednym kliknięciem i pobierasz listę obecności w PDF.',
        scene: 'team',
        beat: 'worktime',
    },
];

const label = 'font-mono text-[0.625rem] tracking-[0.16em] uppercase';

export function Benefits({ onShow }: { onShow: (scene: string, beat?: string) => void }) {
    return (
        <section id="funkcje" aria-labelledby="funkcje-title" className="scroll-mt-24">
            <div className={container}>
                <p className={sectionKicker}>Funkcje</p>
                <h2 id="funkcje-title" className={`mt-4 max-w-[48rem] ${sectionTitle}`}>
                    Co zmienia się w studiu<span className="text-gold-400">.</span>
                </h2>

                <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] sm:mt-16 md:grid-cols-2 xl:grid-cols-3">
                    {BENEFITS.map((b) => (
                        <li key={b.change} className="flex flex-col bg-void p-6 sm:p-8">
                            <p className={`${label} text-dim`}>Dziś</p>
                            <p className="mt-2.5 text-[0.9375rem] leading-[1.55] text-pretty text-white/45 md:min-h-[3.1em]">{b.today}</p>

                            {/* Przejście „dziś → z DetailBoost": linia z krótkim złotym odcinkiem
                                na początku, jak wskaźnik bieżącego kroku przy oknie. */}
                            <div aria-hidden className="relative my-6 h-px bg-white/[0.08]">
                                <span className="absolute inset-y-0 left-0 w-8 bg-gold-400" />
                            </div>

                            <p className={`${label} text-gold-200/90`}>Z DetailBoost</p>
                            <h3 className="mt-2.5 font-ui text-[1.1875rem] leading-snug font-semibold tracking-[-0.02em] text-balance text-paper">
                                {b.change}
                            </h3>
                            <p className="mt-2.5 text-[0.9375rem] leading-[1.6] text-pretty text-mute">{b.how}</p>

                            <button
                                type="button"
                                onClick={() => onShow(b.scene, b.beat)}
                                className="group mt-auto inline-flex w-fit pt-7 font-ui text-[0.875rem] font-medium text-white/80 transition-colors duration-200 hover:text-white"
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
