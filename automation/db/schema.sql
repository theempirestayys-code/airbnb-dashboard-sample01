-- Airsynk automation store for The Empire Stays.
-- Run once against the Postgres that sits next to n8n (docker compose in /opt/airsynk):
--   docker compose exec -T postgres psql -U <user> -d <db> < schema.sql

CREATE SCHEMA IF NOT EXISTS airsynk;

-- One row per listing. Fill address / Wi-Fi / check-in guide so Maya can answer guests.
CREATE TABLE IF NOT EXISTS airsynk.properties (
  code           text PRIMARY KEY,
  name           text NOT NULL,
  city           text NOT NULL,
  area           text,
  address        text,          -- shared with guests only after a booking is confirmed
  wifi_name      text,
  wifi_password  text,
  checkin_guide  text,          -- parking, lift, key/door steps
  house_rules    text,
  floor_rate     numeric,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS airsynk.bookings (
  id                bigserial PRIMARY KEY,
  confirmation_code text UNIQUE,
  guest_first_name  text,
  guest_name        text,
  guest_phone       text,         -- digits with country code, no plus: 9198XXXXXXXX
  listing_name      text,
  listing_code      text REFERENCES airsynk.properties(code),
  check_in          date,
  check_out         date,
  guests            int,
  payout_inr        numeric,
  source_email_id   text,
  status            text NOT NULL DEFAULT 'awaiting_guest_contact',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bookings_phone_idx ON airsynk.bookings (guest_phone);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON airsynk.bookings (status, created_at DESC);

-- Every WhatsApp message in and out, for Maya's memory and the audit trail.
CREATE TABLE IF NOT EXISTS airsynk.messages (
  id            bigserial PRIMARY KEY,
  phone         text NOT NULL,
  direction     text NOT NULL CHECK (direction IN ('in', 'out')),
  body          text,
  wa_msg_id     text UNIQUE,
  contact_name  text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_phone_idx ON airsynk.messages (phone, created_at DESC);

-- Anything Maya will not answer alone. Meet resolves it by WhatsApp reply or by voice on the call.
CREATE TABLE IF NOT EXISTS airsynk.escalations (
  id           text PRIMARY KEY,
  phone        text NOT NULL,
  booking_id   bigint REFERENCES airsynk.bookings(id),
  intent       text,
  urgency      text,
  summary      text,
  draft_reply  text,
  status       text NOT NULL DEFAULT 'open',
  resolution   text,
  final_reply  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz
);
CREATE INDEX IF NOT EXISTS escalations_open_idx ON airsynk.escalations (status, created_at DESC);

INSERT INTO airsynk.properties (code, name, city, area) VALUES
  ('OS A2106',     'White Island*21',     'Mumbai', 'Goregaon East'),
  ('Sol C 2103',   'Coastline Studio*21', 'Thane',  'Hiranandani'),
  ('PCR T5 1901',  'Heaven*19',           'Thane',  'Nr Korum Mall'),
  ('PCR T4 3507',  'NYC*35',              'Thane',  'Nr Korum Mall'),
  ('JG T1 1402',   'Paradise*142',        'Thane',  'Nr TheWalk'),
  ('JG T1 1404',   'Paradise*144',        'Thane',  'Nr TheWalk'),
  ('PCE T4 3006',  'Sky*30',              'Thane',  'Nr Korum Mall'),
  ('PRP3 S2 1701', 'Sky Escape',          'Thane',  'Thane'),
  ('RBA1704',      'Terra Blush*17',      'Thane',  'Nr G-Corp'),
  ('SKYLINE',      'Skyline Hideaway',    'Thane',  'Thane')
ON CONFLICT (code) DO NOTHING;
