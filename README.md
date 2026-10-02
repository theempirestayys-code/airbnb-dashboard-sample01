# airbnb-dashboard-sample01 · Empire Command

Command center for **The Empire Stays** (Airbnb, Mumbai + Thane, India): a voice-first Jarvis home, a money and RevPAR dashboard, a data builder, and a phone-first field app. It is one Next.js codebase that ships as a website and, through Capacitor, as an Android APK. The first n8n automation (booking → WhatsApp → Jarvis calls you) is in `automation/`.

> **Sample data.** Listing names and codes are the real portfolio. Nightly rates, nights sold and costs are sample inputs in `lib/portfolio.ts`, so every KPI reconciles across screens. Replace them with the nightly ledger described on the Data builder page to go live.

## Screens

| Route | What it is |
|---|---|
| `/` | **Hey Jarvis**: tap the orb and speak (Web Speech API, en-IN). Jarvis answers aloud from the portfolio data: money in and out, RevPAR, occupancy, any listing, what needs your decision. It also shows the 5 teams, the "when Jarvis calls you" ladder and the Automation 01 flow. |
| `/dashboard` | Money in, OTA fees, expenses, GOP and margin, each compared with the month before. ADR, Occupancy, RevPAR, TRevPAR, NRevPAR, GOPPAR, CPOR and RGI with formulas. Where every rupee goes, expense lines, daily revenue, channel mix, listings ranked by RevPAR, the agent swarm, and the approval queue. Filters: city (All / Mumbai / Thane / Ahmedabad · Gandhinagar) and Jul / Aug / Sep / Q3. |
| `/data-builder` | Sources → unified model → live metric builder with the working shown, plus prioritised build suggestions (Goal 1–4). |
| `/m` | Field app for the APK: Today, Money, Units, and Agents & approvals tabs. |

## Open it without installing anything

Download `dist/empire-command.html` and double-click it. The whole app (Jarvis, Dashboard, Data builder, Mobile) is in that one file and runs from your disk. Use Chrome for the voice orb. Rebuild it after code changes with `npm run build:html`.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static export → out/
```

## Android APK (Capacitor 8)

Needs Android Studio, or the Android SDK plus JDK 21, on your machine.

```bash
npm run build
npx cap add android      # first time only
npm run cap:sync
npm run cap:open         # build/run from Android Studio, or:
cd android && ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

For voice on Android, also add the `RECORD_AUDIO` permission to `android/app/src/main/AndroidManifest.xml`.

## Design system (Empire Command v1.0)

Tokens live in `app/globals.css` and `design/tokens.json`. They combine three sources:

- **Brand**, from `empire-stays-website`: gold `#c9a96e`, cream, Playfair Display + Inter.
- **Ops**, from `deskline`: dark slate surfaces, signal and alert colours.
- **Telemetry**, from the command-center brief: glass panels, cyan voice `#06b6d4`, and emerald / amber / rose for normal / review / critical.

Rules: money is set in JetBrains Mono with Indian grouping (₹11,52,940) or lakhs (₹11.53 L). Gold is for money and primary actions. A status colour always comes with a word. Touch targets are at least 44 px.

## Automation

`automation/README.md` covers setup, credentials, WhatsApp templates and the test plan for:

- `01a` Airbnb confirmation email → Claude extracts the booking → asks Meet on WhatsApp for the guest's number or a screenshot
- `01b` WhatsApp in → Claude reads Meet's reply (vision for screenshots) and welcomes the guest, or the Maya brain answers guests and escalates. Urgent items make Jarvis phone Meet (Twilio).
- `01c` Meet answers the call by voice → Claude understands → the reply is sent → Jarvis confirms aloud

Replies wait for Meet's approval by default (`AUTO_SEND=false`). Refunds, legal threats, payment disputes and commercial requests are never auto-answered.

## Structure

```
app/            routes (/, /dashboard, /data-builder, /m) + globals.css (design tokens)
components/     ui.tsx (Nav, Chip, Delta, Segmented), JarvisVoice.tsx
lib/            portfolio.ts (data + KPI maths), agents.ts, jarvis.ts (local voice answers)
automation/     n8n workflows, Postgres schema, setup guide
design/         tokens.json
```
