import { ADD_ONS, OFFER_TERMS, PLANS, SIGNUP_URL, SMS_PACKAGES, net, perDay, zl } from '../site';
import { OfferTerms } from './Hero';
import { btnPrimary, btnSecondary, container, sectionKicker, sectionTitle } from './ui';

/*
 * Cennik wprost z katalogu w backendzie: dwa plany i moduły do BASIC, ceny brutto
 * za studio miesięcznie. Kwotę netto pokazujemy obok, bo właściciel firmy liczy
 * w netto, ale nie zaokrąglamy jej „ładnie" - ma się zgadzać z fakturą.
 */
const BASIC_INCLUDES = [
    'Kalendarz i rezerwacje',
    'Baza klientów i pojazdów z historią wizyt',
    'Wizyty, protokoły i dokumenty',
    'Galeria zdjęć',
    'Cały zespół w cenie',
] as const;

const FULL_INCLUDES = [
    'Wszystko z BASIC',
    'Faktury i KSeF, koszty z KSeF',
    'Przypomnienia i statusy SMS i e-mail',
    'Podpisy na tablecie i Karta Wizyty',
    'Statystyki, kampanie, monitoring konkurencji',
    'Asystent AI przy zapytaniach',
] as const;

export function Pricing() {
    const allModules = PLANS.basic.grossCents + ADD_ONS.reduce((sum, a) => sum + a.grossCents, 0);

    return (
        <section id="cennik" aria-labelledby="cennik-title" className="scroll-mt-24">
            <div className={container}>
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className={sectionKicker}>Cennik</p>
                        <h2 id="cennik-title" className={`mt-4 ${sectionTitle}`}>
                            Pierwsze 3 miesiące za darmo<span className="text-gold-400">.</span>
                        </h2>
                    </div>
                    <p className="max-w-[26rem] text-[1.0625rem] leading-[1.6] text-pretty text-mute">
                        Bez karty i bez umowy terminowej. W okresie próbnym przełączasz się na FULL bez opłat
                        i sprawdzasz wszystkie moduły na swoim studiu.
                    </p>
                </div>

                <div className="mt-12 grid gap-4 sm:mt-16 lg:grid-cols-2">
                    <PlanCard
                        name={PLANS.basic.name}
                        lead="Kalendarz, klienci i wizyty. Moduły dokładasz, kiedy ich potrzebujesz."
                        grossCents={PLANS.basic.grossCents}
                        includes={BASIC_INCLUDES}
                    />
                    <PlanCard
                        name={PLANS.full.name}
                        lead="Wszystkie moduły w jednej cenie."
                        grossCents={PLANS.full.grossCents}
                        includes={FULL_INCLUDES}
                        note={`Taniej o ${zl(allModules - PLANS.full.grossCents)} zł niż BASIC ze wszystkimi modułami osobno (${zl(allModules)} zł).`}
                        featured
                    />
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-12">
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8 lg:col-span-7">
                        <h3 className="font-ui text-[1.0625rem] font-semibold tracking-[-0.015em] text-paper">
                            Moduły do planu BASIC
                        </h3>
                        <ul className="mt-5 grid gap-x-8 sm:grid-cols-2">
                            {ADD_ONS.map((a) => (
                                <li key={a.name} className="flex items-baseline justify-between gap-4 border-b border-white/[0.06] py-3">
                                    <span className="min-w-0">
                                        <span className="block text-[0.9375rem] text-white/85">{a.name}</span>
                                        <span className="block text-[0.8125rem] text-dim">{a.note}</span>
                                    </span>
                                    <span className="shrink-0 font-mono text-[0.8125rem] text-white/80 tabular-nums">
                                        {zl(a.grossCents)} zł
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <SmsPackages />
                </div>

                <p className="mt-6 font-ui text-[0.8125rem] leading-relaxed text-dim">
                    Ceny planów i modułów brutto (z 23% VAT), miesięcznie, za jedno studio.
                </p>
            </div>
        </section>
    );
}

function PlanCard({
    name,
    lead,
    grossCents,
    includes,
    note,
    featured = false,
}: {
    name: string;
    lead: string;
    grossCents: number;
    includes: readonly string[];
    note?: string;
    featured?: boolean;
}) {
    return (
        <div
            className={`relative flex flex-col rounded-2xl border p-6 sm:p-8 ${
                featured
                    ? 'border-gold-400/40 bg-[linear-gradient(180deg,rgb(220_174_92/0.08),rgb(220_174_92/0.01)_45%)] shadow-[0_30px_80px_-40px_rgb(220_174_92/0.45)]'
                    : 'border-white/[0.08] bg-white/[0.02]'
            }`}
        >
            <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-display text-[1.5rem] font-[800] tracking-[-0.02em] text-paper [font-stretch:108%]">{name}</h3>
                {featured && (
                    <span className="rounded-full border border-gold-400/40 px-2.5 py-1 font-ui text-[0.75rem] font-medium text-gold-200">
                        Wszystkie moduły
                    </span>
                )}
            </div>
            <p className="mt-2 text-[0.9375rem] leading-[1.5] text-mute">{lead}</p>

            <p className="mt-8 flex items-baseline gap-2">
                <span className="font-display text-[3.5rem] leading-none font-[800] tracking-[-0.04em] text-paper [font-stretch:100%]">
                    {zl(grossCents)}
                </span>
                <span className="font-ui text-[0.9375rem] text-white/70">zł / mies.</span>
            </p>
            <dl className="mt-3 flex gap-6 font-ui text-[0.8125rem]">
                <div>
                    <dt className="text-dim">netto</dt>
                    <dd className="font-mono text-white/75 tabular-nums">{zl(net(grossCents))} zł</dd>
                </div>
                <div>
                    <dt className="text-dim">dziennie</dt>
                    <dd className="font-mono text-white/75 tabular-nums">ok. {zl(perDay(grossCents))} zł</dd>
                </div>
            </dl>

            <ul className="mt-8 flex flex-1 flex-col gap-3">
                {includes.map((item) => (
                    <li key={item} className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-2 text-[0.9375rem] leading-[1.5] text-white/80">
                        <span aria-hidden className={`mt-[0.6em] h-px w-2 ${featured ? 'bg-gold-400' : 'bg-white/40'}`} />
                        {item}
                    </li>
                ))}
            </ul>
            {note && <p className="mt-6 text-[0.8125rem] leading-relaxed text-gold-200/80">{note}</p>}

            <div className="mt-8 flex flex-col gap-2">
                <a href={SIGNUP_URL} className={featured ? btnPrimary : btnSecondary}>
                    Wypróbuj 3 miesiące za darmo
                </a>
                <OfferTerms terms={OFFER_TERMS.slice(1)} className="justify-center text-[0.75rem]" />
            </div>
        </div>
    );
}

/**
 * Pakiety SMS jako cennik, nie zdanie: liczba SMS, cena pakietu i cena jednej
 * wiadomości, a pasek pokazuje, jak spada cena SMS-a z wielkością pakietu.
 * Najtańszy SMS (największy pakiet) ma złoty pasek - jedyny akcent w karcie.
 */
function SmsPackages() {
    const perSms = SMS_PACKAGES.map((p) => p.grossCents / p.credits);
    const max = Math.max(...perSms);
    const min = Math.min(...perSms);
    return (
        <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8 lg:col-span-5">
            <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-ui text-[1.0625rem] font-semibold tracking-[-0.015em] text-paper">Pakiety SMS</h3>
                <span className="font-ui text-[0.75rem] text-dim">jednorazowo, brutto</span>
            </div>
            <p className="mt-2 text-[0.875rem] leading-[1.55] text-mute">
                Dokupujesz, kiedy potrzebujesz. Niewykorzystane SMS-y zostają na koncie.
            </p>

            <table className="mt-6 w-full border-collapse font-ui text-[0.875rem]">
                <thead>
                    <tr className="text-left font-mono text-[0.625rem] tracking-[0.14em] text-dim uppercase">
                        <th className="pb-2 font-normal">SMS</th>
                        <th className="pb-2 font-normal">
                            <span className="sr-only">Cena za SMS na tle pakietów</span>
                        </th>
                        <th className="pb-2 text-right font-normal">za SMS</th>
                        <th className="pb-2 text-right font-normal">pakiet</th>
                    </tr>
                </thead>
                <tbody>
                    {SMS_PACKAGES.map((p, i) => {
                        const price = perSms[i] ?? 0;
                        const best = price === min;
                        return (
                            <tr key={p.credits} className="border-t border-white/[0.06]">
                                <td className="py-2.5 pr-4 font-mono text-white/85 tabular-nums">
                                    {p.credits.toLocaleString('pl-PL')}
                                </td>
                                <td className="w-full py-2.5 pr-4" aria-hidden>
                                    <span className="block h-1 overflow-hidden rounded-full bg-white/[0.06]">
                                        <span
                                            className={`block h-full rounded-full ${best ? 'bg-gold-400' : 'bg-white/25'}`}
                                            style={{ width: `${(price / max) * 100}%` }}
                                        />
                                    </span>
                                </td>
                                <td className={`py-2.5 pr-4 text-right font-mono whitespace-nowrap tabular-nums ${best ? 'text-gold-200' : 'text-white/60'}`}>
                                    {Math.round(price)} gr
                                </td>
                                <td className="py-2.5 text-right font-mono whitespace-nowrap text-white/85 tabular-nums">
                                    {zl(p.grossCents)} zł
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
