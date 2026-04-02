-- Client Onboarding Funnel Schema
-- Customisable multi-step quiz + property matching + Telegram delivery

-- =============================================
-- QUIZ CONFIGURATION (admin-customisable steps)
-- =============================================
CREATE TABLE IF NOT EXISTS quiz_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- which agent owns this quiz
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL DEFAULT 'Property Search',
  slug TEXT NOT NULL,                    -- URL slug: /quiz/{slug}
  welcome_title TEXT DEFAULT 'Encontre a sua propriedade ideal',
  welcome_subtitle TEXT DEFAULT 'Responda a algumas perguntas e enviaremos opcoes que correspondem ao que procura.',
  completion_message TEXT DEFAULT 'Obrigado! Vamos enviar-lhe opcoes em breve via Telegram.',
  is_active BOOLEAN DEFAULT TRUE,
  brand_color TEXT DEFAULT '#ffffff',
  logo_url TEXT,
  UNIQUE(user_id, slug)
);

CREATE TABLE IF NOT EXISTS quiz_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES quiz_config(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  question TEXT NOT NULL,
  description TEXT,
  field_key TEXT NOT NULL,              -- maps to client_leads column or metadata key
  field_type TEXT NOT NULL CHECK (field_type IN ('select', 'multi_select', 'text', 'number', 'range', 'location', 'tel', 'email')),
  options JSONB,                        -- for select/multi_select: [{"value": "villa", "label": "Moradia", "icon": "🏠"}, ...]
  is_required BOOLEAN DEFAULT TRUE,
  placeholder TEXT,
  min_value DOUBLE PRECISION,           -- for number/range
  max_value DOUBLE PRECISION,
  step_unit TEXT,                       -- e.g. "EUR", "m2"
  UNIQUE(quiz_id, step_order)
);

-- =============================================
-- CLIENT LEADS (quiz submissions)
-- =============================================
CREATE TABLE IF NOT EXISTS client_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- which agent
  quiz_id UUID REFERENCES quiz_config(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Client info
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  telegram_chat_id TEXT,                -- for sending matches via Telegram
  telegram_username TEXT,

  -- Search criteria
  property_types TEXT[] DEFAULT '{}',   -- villa, land, farm, ruin
  districts TEXT[] DEFAULT '{}',
  municipalities TEXT[] DEFAULT '{}',
  min_area_m2 DOUBLE PRECISION,
  max_area_m2 DOUBLE PRECISION,
  min_budget DECIMAL(12,2),
  max_budget DECIMAL(12,2),
  num_bedrooms_min INTEGER,
  num_bedrooms_max INTEGER,
  condition_preferences TEXT[] DEFAULT '{}',  -- new, good, needs_renovation, ruin
  features TEXT[] DEFAULT '{}',         -- pool, garden, sea_view, garage, etc.
  timeline TEXT,                        -- asap, 3_months, 6_months, 1_year, just_looking

  -- Extra quiz answers stored as JSON
  quiz_answers JSONB DEFAULT '{}',

  -- Pipeline
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'active', 'viewing', 'offer', 'closed', 'lost')),
  matches_sent INTEGER DEFAULT 0,
  last_match_sent_at TIMESTAMPTZ,
  notes TEXT,
  tags TEXT[] DEFAULT '{}'
);

-- =============================================
-- PROPERTY LISTINGS (your inventory to match against)
-- =============================================
CREATE TABLE IF NOT EXISTS property_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Property details
  title TEXT NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN ('villa', 'land', 'farm', 'ruin')),
  description TEXT,

  -- Location
  district TEXT,
  municipality TEXT,
  parish TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- Specs
  price DECIMAL(12,2),
  area_total_m2 DOUBLE PRECISION,
  area_built_m2 DOUBLE PRECISION,
  num_bedrooms INTEGER,
  num_bathrooms INTEGER,
  year_built INTEGER,
  condition TEXT CHECK (condition IN ('new', 'good', 'needs_renovation', 'ruin')),
  features TEXT[] DEFAULT '{}',          -- pool, garden, sea_view, etc.

  -- Media
  images TEXT[] DEFAULT '{}',            -- URLs to images
  thumbnail_url TEXT,

  -- Status
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'under_offer', 'sold', 'archived')),
  source TEXT,
  source_url TEXT
);

-- =============================================
-- MATCH LOG (which listings were sent to which leads)
-- =============================================
CREATE TABLE IF NOT EXISTS property_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES client_leads(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES property_listings(id) ON DELETE CASCADE,
  match_score DOUBLE PRECISION,          -- 0-100 how well it matches
  sent_via TEXT DEFAULT 'telegram' CHECK (sent_via IN ('telegram', 'email', 'whatsapp', 'manual')),
  sent_at TIMESTAMPTZ,
  client_response TEXT CHECK (client_response IN ('interested', 'not_interested', 'viewing_requested', 'no_response')),
  responded_at TIMESTAMPTZ,
  UNIQUE(lead_id, listing_id)
);

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE quiz_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_matches ENABLE ROW LEVEL SECURITY;

-- Quiz config: owners can CRUD, anyone can read active quizzes (for the public quiz page)
CREATE POLICY "Users can manage own quiz config" ON quiz_config FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public can view active quizzes" ON quiz_config FOR SELECT USING (is_active = TRUE);

-- Quiz steps: owners can CRUD, anyone can read (for rendering the quiz)
CREATE POLICY "Users can manage own quiz steps" ON quiz_steps FOR ALL USING (
  quiz_id IN (SELECT id FROM quiz_config WHERE user_id = auth.uid())
);
CREATE POLICY "Public can view quiz steps" ON quiz_steps FOR SELECT USING (
  quiz_id IN (SELECT id FROM quiz_config WHERE is_active = TRUE)
);

-- Client leads: only the owning agent
CREATE POLICY "Users can manage own leads" ON client_leads FOR ALL USING (auth.uid() = user_id);

-- Property listings: only the owning agent
CREATE POLICY "Users can manage own listings" ON property_listings FOR ALL USING (auth.uid() = user_id);

-- Property matches: only the owning agent
CREATE POLICY "Users can manage own matches" ON property_matches FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_quiz_config_user ON quiz_config(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_config_slug ON quiz_config(slug);
CREATE INDEX IF NOT EXISTS idx_quiz_steps_quiz ON quiz_steps(quiz_id);
CREATE INDEX IF NOT EXISTS idx_client_leads_user ON client_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_client_leads_status ON client_leads(status);
CREATE INDEX IF NOT EXISTS idx_property_listings_user ON property_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_property_listings_type ON property_listings(property_type);
CREATE INDEX IF NOT EXISTS idx_property_listings_district ON property_listings(district);
CREATE INDEX IF NOT EXISTS idx_property_listings_status ON property_listings(status);
CREATE INDEX IF NOT EXISTS idx_property_matches_lead ON property_matches(lead_id);
CREATE INDEX IF NOT EXISTS idx_property_matches_listing ON property_matches(listing_id);
