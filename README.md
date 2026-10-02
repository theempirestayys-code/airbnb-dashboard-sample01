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
lib/            portfolio.ts (data + KPI maths), agents.ts, jarvis.ts (built-in rule brain)
jarvis/         local swarm brain: llm.ts (any OpenAI-compatible API), team.ts, data.ts, swarm.ts, server.ts
mcp/            server.ts: Empire Jarvis MCP server (registered in .mcp.json)
automation/     n8n workflows, Postgres schema, setup guide
design/         tokens.json
.github/        workflows/pages.yml: deploys to GitHub Pages on every push to main
```

## Live site

Every push to `main` builds and deploys to GitHub Pages: **https://theempirestayys-code.github.io/airbnb-dashboard-sample01/**. The public site always shows sample data and uses the built-in rule brain.

## Jarvis swarm (local)

The voice home talks to a local brain when one is running on your Mac. Without one, it uses the built-in rule brain.

```
Meet speaks → Jarvis (browser voice) → 127.0.0.1:8787 → Maya plans
   → 1–4 agents in parallel (each with its own role card, SOP and data slice)
   → Maya merges one answer → Jarvis speaks it
```

```bash
cp .env.example .env     # then paste your OpenRouter key into LLM_API_KEY
npm run jarvis           # http://127.0.0.1:8787/health
npm run dev              # open http://localhost:3000 and tap the orb
```

- **Provider:** any OpenAI-compatible API. The default is OpenRouter: `x-ai/grok-4.7` for Maya and Arjun, and `x-ai/grok-4.3` for the other 12 agents. To use xAI, OpenAI or a local Ollama server, change `LLM_BASE_URL`, the key and the model names in `.env`.
- **Team:** the 14 ERA 2.0 agents. Their role cards and SOPs are read at runtime from the local `ERA2_Build/04_Agents` folder and are never copied into this repo. Without that folder, Jarvis uses a roster with names only.
- **Data:** each agent reads only its own scopes (see `READS` in `jarvis/team.ts`). Real figures come from the local ERA 2.0 `portfolio.json`, otherwise sample data, and every slice says which. Owner names and Airbnb listing IDs are removed before anything goes to the model provider. Set `TES_DATA=sample` to force sample data.
- **Guardrails:** agents only propose. Moving money, publishing prices, refunds, owner payouts and guest or owner messages always come back as decisions for Meet.
- **Security:** the brain listens on `127.0.0.1` only, accepts JSON from allow-listed origins only, and your key stays in `.env`, which git ignores.

## MCP server

`.mcp.json` registers `empire-jarvis` for Claude Code in this folder. To add it to Claude Desktop, add the same entry with `"cwd"` set to this folder.

| Tool | What it does | Needs key |
|---|---|---|
| `jarvis_status` | Shows whether the swarm is on, plus the provider, models, data source and team source | no |
| `list_agents` | Lists the 14 agents: seat, mission, autonomy, model tier, data scopes | no |
| `get_agent_skill` | One agent's role card and full SOP | no |
| `get_agent_data` | Exactly the data one agent may read | no |
| `get_data` | One scope: kpis, listings, money, channels, approvals, team, today, feeds, pipeline, compliance | no |
| `jarvis_quick_answer` | Instant rule-brain answer from sample data | no |
| `ask_agent` | Gives one agent a task and returns its answer in role | yes |
| `run_swarm` | Runs the full swarm and returns the plan, each agent's output and the final reply | yes |
