-- Migration: Add pixel metadata columns
-- Description: Adds visitor_id, visitor_email, visitor_name, value, and currency columns to pixel_events table
-- to allow extracting these fields from the metadata JSON.

ALTER TABLE pixel_events
ADD COLUMN IF NOT EXISTS visitor_id TEXT,
ADD COLUMN IF NOT EXISTS visitor_email TEXT,
ADD COLUMN IF NOT EXISTS visitor_name TEXT,
ADD COLUMN IF NOT EXISTS value DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'PHP';

-- Add indexes for these new columns to improve query performance
CREATE INDEX IF NOT EXISTS idx_pixel_events_visitor_id ON pixel_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_pixel_events_visitor_email ON pixel_events(visitor_email);
