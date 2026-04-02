-- Follow-up sequences and activity tracking

-- =============================================
-- FOLLOW-UP SEQUENCES
-- =============================================
CREATE TABLE IF NOT EXISTS follow_up_sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,

  -- Sequence steps as JSON array:
  -- [{ "delay_days": 3, "subject": "...", "body_text": "...", "body_html": "..." }, ...]
  steps JSONB NOT NULL DEFAULT '[]'
);

-- Track which contacts are in which sequence
CREATE TABLE IF NOT EXISTS follow_up_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES follow_up_sequences(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 0,
  next_send_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'replied', 'opted_out')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, sequence_id)
);

-- =============================================
-- ACTIVITY TIMELINE
-- =============================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Polymorphic: can reference a contact or a lead
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES client_leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'email_sent', 'email_opened', 'email_replied', 'email_bounced',
    'status_changed', 'note_added', 'call_logged', 'meeting_scheduled',
    'follow_up_started', 'follow_up_completed', 'follow_up_paused',
    'quiz_submitted', 'match_sent', 'lead_created',
    'telegram_sent', 'opted_out'
  )),
  description TEXT,
  metadata JSONB DEFAULT '{}'
);

-- =============================================
-- AGENT NOTIFICATION SETTINGS
-- =============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_bot_chat_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_new_lead BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_email_reply BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_quiz_submission BOOLEAN DEFAULT TRUE;

-- =============================================
-- RLS
-- =============================================
ALTER TABLE follow_up_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sequences" ON follow_up_sequences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own follow-up queue" ON follow_up_queue FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own activity log" ON activity_log FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_follow_up_queue_next ON follow_up_queue(next_send_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_follow_up_queue_contact ON follow_up_queue(contact_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_contact ON activity_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_lead ON activity_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
