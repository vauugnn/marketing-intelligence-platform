-- AI Recommendations Table
-- Stores AI-generated marketing recommendations
-- Created: 2026-02-08

CREATE TABLE IF NOT EXISTS ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Recommendation type and content
  type TEXT NOT NULL CHECK (type IN ('scale', 'optimize', 'stop')),
  channel TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  
  -- Impact and confidence
  estimated_impact DECIMAL(12, 2) DEFAULT 0,
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  
  -- Status tracking
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_ai_recommendations_user_id ON ai_recommendations(user_id);
CREATE INDEX idx_ai_recommendations_active ON ai_recommendations(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_ai_recommendations_created ON ai_recommendations(created_at);
