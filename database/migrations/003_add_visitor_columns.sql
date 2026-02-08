-- Add visitor columns to pixel_events table
ALTER TABLE pixel_events
ADD COLUMN IF NOT EXISTS visitor_id TEXT,
ADD COLUMN IF NOT EXISTS visitor_email TEXT,
ADD COLUMN IF NOT EXISTS visitor_name TEXT,
ADD COLUMN IF NOT EXISTS value DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

CREATE INDEX IF NOT EXISTS idx_pixel_events_visitor_id ON pixel_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_pixel_events_visitor_email ON pixel_events(visitor_email);
