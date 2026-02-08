-- Create short_links table for custom UTM transformer
CREATE TABLE IF NOT EXISTS short_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  original_url TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_short_links_code ON short_links(code);
