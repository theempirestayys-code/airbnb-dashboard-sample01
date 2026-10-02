# Automation 01 · Booking → guest WhatsApp → Jarvis calls Meet

The first live automation for The Empire Stays. It runs on the existing n8n server (`airsynk-n8n`, GCP asia-south1), with Claude as the brain.

```
Airbnb "Reservation confirmed" email (Gmail)
  └─ 01A  Claude extracts the booking → saved to Postgres → WhatsApp to Meet:
          "New booking … reply with the guest's name + number, or a screenshot"
Meet replies on WhatsApp (text or screenshot)
  └─ 01B  Claude reads it (vision for screenshots) → guest attached to booking
          → Maya sends the approved welcome template to the guest → Meet gets "Done"
Guest writes on WhatsApp
  └─ 01B  Maya brain (Claude) reads booking + property + last 12 messages
          ├─ routine      → draft to Meet (AUTO_SEND=false) or reply directly (AUTO_SEND=true)
          ├─ escalation   → short holding reply (never for refunds/legal/disputes) + alert to Meet
          └─ urgent/critical → Jarvis PHONES Meet, reads the situation and Maya's draft
Meet answers the call by voice ("approve", "hold", or "tell her the AC man is coming at 4")
  └─ 01C  Claude understands the speech → sends to the guest → speaks back "Done, sent."
Meet can also just reply "send" / "hold" / dictate on WhatsApp → same result.
```

Every run posts a one-line summary to Slack `#all-the-empire-stayys` (set `SLACK_CHANNEL` in each `Config` node).

## Files

| File | What it is |
|---|---|
| `db/schema.sql` | Tables `properties`, `bookings`, `messages`, `escalations` in schema `airsynk`, plus the 10 listings |
| `workflows/01a-booking-confirmed-ask-meet.json` | Gmail trigger → Claude extract → save → WhatsApp Meet |
| `workflows/01b-whatsapp-maya-brain.json` | WhatsApp webhook → Meet's contact/decisions, or Maya brain for guests → reply / escalate / call |
| `workflows/01c-jarvis-voice-decision.json` | Twilio speech webhook → Claude → act → speak back |

## Setup, in order

1. **Server up and on HTTPS.** Make sure your n8n VM is running. Then point a domain such as `n8n.theempirestayys.com` at the server and put Caddy in front. Meta and Twilio only call HTTPS webhooks. Set `WEBHOOK_URL=https://n8n.<domain>/` in the n8n container.
2. **Database.** Run `db/schema.sql` once against the Postgres container. Then fill `airsynk.properties` with each unit's address, Wi-Fi, check-in guide and house rules. Maya only says what is in this table.
3. **Credentials in n8n** (Settings → Credentials). You type the secrets; Claude never does.

   | n8n credential | Type | Value |
   |---|---|---|
   | `Anthropic API` | Header Auth | Name `x-api-key`, Value = key from console.anthropic.com/settings/keys |
   | `WhatsApp Cloud API` | Header Auth | Name `Authorization`, Value `Bearer <permanent system-user token>` |
   | `Slack bot` | Header Auth | Name `Authorization`, Value `Bearer xoxb-…` (scope `chat:write`, bot invited to the channel) |
   | `Twilio` | Basic Auth | User = Account SID, Password = Auth Token |
   | `Airsynk Postgres` | Postgres | host `postgres`, the compose DB user/password |
   | `Gmail` | Gmail OAuth2 | Google OAuth client in your GCP project; redirect `https://n8n.<domain>/rest/oauth2-credential/callback` |

4. **Import** the three JSON files (Workflows → Import from file). In each HTTP node choose the matching credential: Anthropic, WhatsApp, Slack or Twilio by node name. Then fill the `Config` node in each workflow with Meet's numbers, the WhatsApp phone number ID, the Twilio number and the public n8n URL.
5. **Meta webhook.** In the WhatsApp app go to Configuration → Webhook. Set the callback to `https://n8n.<domain>/webhook/tes-wa` and the verify token to the string in the `Check verify token` node. Subscribe to `messages`.
6. **WhatsApp templates.** Submit these three in WhatsApp Manager (category Utility, language English). Business-initiated messages need an approved template.

   - `tes_new_booking_alert` (to Meet): *New Airbnb booking: {{1}} for {{2}}, {{3}}, code {{4}}. Reply with the guest's name and WhatsApp number, or send a screenshot of the reservation, and Maya will take it from here.*
   - `tes_booking_welcome` (to guest): *Hello {{1}}, this is Maya from The Empire Stays. Thank you for booking {{2}}, arriving {{3}}. Check-in is from 2:00 PM and check-out by 11:00 AM. I will send your check-in guide the day before you arrive. Is there anything I can arrange for you before then?*
   - `tes_meet_alert` (to Meet): *{{1}} from {{2}}. What happened: {{3}}. Maya suggests: {{4}}. Reply send to approve, hold to wait, or type what to say.*

7. **Twilio.** Buy a voice number and enable geo permissions for calls to India. No webhook is needed on the number: each call carries its own TwiML, and Meet's spoken answer posts to `/webhook/tes-voice`.
8. **Activate** 01A, 01B and 01C.

## Test plan before real guests

1. Forward an old Airbnb confirmation email to the connected inbox. Expect a WhatsApp from the automation number within about a minute.
2. Reply with `Rahul 98XXXXXXXX` from Meet's phone, using a test number you own as the "guest". The test phone gets the welcome template and Meet gets "Done".
3. From the test phone, ask "what time is check-in?". Meet gets a DRAFT alert. Reply `send` and the guest receives it.
4. From the test phone, write "the AC is not working and it's very hot". Expect a holding reply, an URGENT alert, and a phone call. Say "approve" on the call; the guest gets Maya's draft and Jarvis says "Done".
5. From the test phone, write "I want a refund". Expect no reply to the guest, only an alert to Meet. This is policy.

## Safety switches

- `AUTO_SEND` in 01B `Config` is **false**. Every guest reply waits for Meet's approval until it is switched on, following the draft-only convention in airsynk-cloud-ops.
- Refunds, payment disputes, legal threats, commercial shoots and anything suspicious never get an automatic reply, whatever `AUTO_SEND` says. This is enforced in code, not only in the prompt.
- Maya never invents addresses, Wi-Fi details or codes. If a value is missing from `airsynk.properties`, she says she will confirm.
- `send` approves the **latest** open item. With several open items, Meet should dictate the reply or use the voice call, which is tied to one item id.

## Known gaps (next iterations)

- Meta webhook signature (`X-Hub-Signature-256`) is not yet checked. Add it once n8n is on HTTPS, using the raw-body option on the webhook.
- Guest voice notes are logged as "[voice note]". Transcription comes in a later automation.
- Airbnb gives hosts no public API, so Gmail is the booking trigger. If you move to a PMS (Hostaway, Hospitable), swap 01A's trigger for its `reservation.created` webhook; the rest stays.
