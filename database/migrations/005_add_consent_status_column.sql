-- Add consent_status column to pixel_events
-- Tracks whether the user accepted or declined cookie consent

ALTER TABLE pixel_events ADD COLUMN IF NOT EXISTS consent_status TEXT;
CREATE INDEX IF NOT EXISTS idx_pixel_events_consent_status ON pixel_events(consent_status);
