# Apurado

A weekly earnings tracker for ride-hailing drivers. Set a weekly target, log every
fare and every fuel stop, and the app shows what is actually left.

Mobile-first PWA: installable, works offline, and every record stays on the device.
No account, no server, no personal data leaving the phone.

**Live app:** https://apurado.vercel.app

## Why it exists

The drivers I know track earnings on paper or in a notes app, and they track gross.
Fuel comes out of the same pocket but rarely makes it into the number, so the figure
they carry in their head is always higher than the real one. Apurado subtracts fuel
by default. The number on the screen is the number that matters.

## What it does

- Weekly target with a running "net so far" counter
- Log fares and fuel in two taps, delete a wrong entry in one
- Monthly view that rolls the weeks up automatically
- Optional home-to-work commute tracker
- Peak-hour blocks, configurable for any day of the week
- JSON backup export and import, using the native share sheet on iOS

## Technical notes

- React 19 and TypeScript, built with Vite
- `vite-plugin-pwa` for the service worker and the offline cache
- State lives in `localStorage`. The app calls `navigator.storage.persist()` on first
  load so the browser does not evict the data under storage pressure
- Backup import validates the schema version and the shape of the file before it
  overwrites anything, and still accepts the older pre-envelope format. Covered by
  Vitest
- No backend, so there is no database to breach and nothing to pay for per user

## Running it

```bash
npm install
cp .env.example .env     # optional, see below
npm run dev              # http://localhost:5173
npm test                 # Vitest
npm run build            # writes dist/ including the service worker
npm run preview          # serves the build on http://localhost:4173
```

### Configuration

| Variable | Required | What it does |
| --- | --- | --- |
| `VITE_FEEDBACK_PHONE` | No | WhatsApp number the feedback button opens, as country code + area code + number, digits only. If unset, the button falls back to this repository's issues. |

The number is deliberately not committed. Set it in your deployment environment.

## Known limitations

- Data is per device. Moving to a new phone means exporting and importing a backup
  by hand. Sync would need a backend, which would mean accounts and a bill
- Amounts are Brazilian reais only
- The UI is in Portuguese, since that is who it is for

## License

Copyright © 2026 Filipe Pedroso. Published for reference. Not released under an
open-source license.
