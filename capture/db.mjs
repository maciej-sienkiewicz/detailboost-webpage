// capture/db.mjs
// Dostęp do lokalnej bazy CRM na potrzeby nagrań: odczyt identyfikatorów świeżego
// konta demo i dosianie danych, których lokalnie nie da się wytworzyć (patrz README).
import { execFileSync } from 'node:child_process';

const DB = process.env.CRM_DB ?? 'detailing_crm';

export function sql(query) {
    return execFileSync('sudo', ['-u', 'postgres', 'psql', '-d', DB, '-At', '-F', '\t', '-v', 'ON_ERROR_STOP=1', '-c', query], {
        encoding: 'utf8',
    }).trim();
}

export const q = (v) => `'${String(v).replace(/'/g, "''")}'`;

export function rows(query) {
    const out = sql(query);
    return out ? out.split('\n').map((line) => line.split('\t')) : [];
}
