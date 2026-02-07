-- Migration: Add performance indexes for attribution queries
-- Created: 2026-02-07
-- Description: Improves query performance for email lookups, time-based queries,
--              and attribution filtering

-- Add index on users.email for faster user lookups during attribution
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add index on raw_events.event_type for filtering payment events
CREATE INDEX IF NOT EXISTS idx_raw_events_event_type ON raw_events(event_type);

-- Add composite index on raw_events for user + timestamp queries
CREATE INDEX IF NOT EXISTS idx_raw_events_user_timestamp ON raw_events(user_id, timestamp);

-- Add index on verified_conversions.confidence_level for filtering
CREATE INDEX IF NOT EXISTS idx_verified_conversions_confidence ON verified_conversions(confidence_level);

-- Add index on verified_conversions.attribution_method for analytics
CREATE INDEX IF NOT EXISTS idx_verified_conversions_method ON verified_conversions(attribution_method);

-- Add index on verified_conversions.attributed_channel for filtering by channel
CREATE INDEX IF NOT EXISTS idx_verified_conversions_channel ON verified_conversions(attributed_channel);
