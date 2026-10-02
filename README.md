# detailboost-webpage

Strona główna DetailBoost, CRM dla studiów auto detailingu. Na razie jeden ekran:
pasek nawigacji i sekcja Hero z oknem aplikacji.

React 19, Tailwind CSS 4, Vite 8, TypeScript. Krój: Inter (zmienny, z osią `opsz`),
hostowany lokalnie przez `@fontsource-variable`.

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build do dist/
```

## Zasady projektu

- **Zero ikon.** Hierarchię niesie wielkość, grubość i interlinia pisma oraz siatka.
  Numeracja `01.`–`04.` stoi w osobnej kolumnie przed tekstem, menu na telefonie
  otwiera słowo „Menu".
- **Pięć kolorów** (`src/index.css`, blok `@theme`): papier `#F9FAFB`, czerń, grafit,
  szarość opisu, linia. Bez koloru akcentu.
- **Jedno wypełnienie na ekran:** „Rozpocznij za darmo". Reszta przycisków to obwódka.
- **Tylko prawda o produkcie.** Każda liczba i funkcja w Hero jest sprawdzona w kodzie
  CRM (`automotive-crm-v2-backend`, `detailing-crm-v2`). Czego system nie robi
  (przeciąganie wizyt w kalendarzu, synchronizacja z Kalendarzem Google, eksport CSV
  klientów), tego strona nie obiecuje.

## Zrzuty aplikacji

`public/screens/` to prawdziwe zrzuty z działającego CRM na koncie demonstracyjnym
(`POST /api/v1/demo`), nie makiety. Okno w Hero pokazuje kalendarz w widoku tygodnia,
a na telefonie zrzut z mobilnego układu CRM.

Ponowne nagranie:

1. Backend: `./gradlew bootRun -PksefStub` w `automotive-crm-v2-backend` (Postgres
   z `pgvector`, Redis; bez klucza OpenAI trzeba podać dowolny `SPRING_AI_OPENAI_API_KEY`).
2. Front CRM: `npm run dev` w `detailing-crm-v2`, pod `http://localhost:5173`. Musi to
   być `localhost`, bo CORS backendu nie wpuszcza `127.0.0.1`.
3. Tutaj:

```sh
node capture/capture.mjs     # PNG do capture/raw (poza repozytorium)
node capture/optimize.mjs    # WebP do public/screens
```

`calendar-month` i `customers` są nagrane na zapas, do kolejnych sekcji.
