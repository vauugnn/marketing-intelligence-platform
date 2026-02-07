-- Marketing Intelligence Platform Database Schema
-- Supabase PostgreSQL Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  pixel_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform connections (OAuth tokens stored per user)
CREATE TABLE IF NOT EXISTS platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT DEFAULT 'disconnected',
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  platform_account_id TEXT,
  metadata JSONB,
  connected_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Raw events from platforms (Ticket 1.1)
CREATE TABLE IF NOT EXISTS raw_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_raw_events_user_platform ON raw_events(user_id, platform);
CREATE INDEX idx_raw_events_timestamp ON raw_events(timestamp);

-- Pixel events (Ticket 1.2)
CREATE TABLE IF NOT EXISTS pixel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pixel_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  page_url TEXT NOT NULL,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  user_agent TEXT,
  ip_address INET,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pixel_events_pixel_id ON pixel_events(pixel_id);
CREATE INDEX idx_pixel_events_session_id ON pixel_events(session_id);
CREATE INDEX idx_pixel_events_timestamp ON pixel_events(timestamp);

-- Verified conversions (Ticket 1.3)
CREATE TABLE IF NOT EXISTS verified_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  transaction_id TEXT UNIQUE NOT NULL,
  email TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'PHP',

  -- Attribution sources
  pixel_session_id TEXT,
  ga4_session_id TEXT,
  attributed_channel TEXT,

  -- Confidence scoring
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  confidence_level TEXT CHECK (confidence_level IN ('high', 'medium', 'low')),
  attribution_method TEXT CHECK (attribution_method IN ('dual_verified', 'single_source', 'uncertain')),

  -- Flags
  is_platform_over_attributed BOOLEAN DEFAULT FALSE,
  conflicting_sources TEXT[],

  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_verified_conversions_user_id ON verified_conversions(user_id);
CREATE INDEX idx_verified_conversions_email ON verified_conversions(email);
CREATE INDEX idx_verified_conversions_timestamp ON verified_conversions(timestamp);
