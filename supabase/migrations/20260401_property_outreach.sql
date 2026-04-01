-- Portugal Property Owner Outreach Schema

-- Districts and municipalities reference
CREATE TABLE IF NOT EXISTS pt_districts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS pt_municipalities (
  id SERIAL PRIMARY KEY,
  district_id INTEGER REFERENCES pt_districts(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS pt_parishes (
  id SERIAL PRIMARY KEY,
  municipality_id INTEGER REFERENCES pt_municipalities(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE
);

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Property details
  property_type TEXT NOT NULL CHECK (property_type IN ('villa', 'land', 'farm', 'ruin', 'other')),
  description TEXT,

  -- Location
  district TEXT,
  municipality TEXT,
  parish TEXT,
  address TEXT,
  postal_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- Registry info
  artigo_matricial TEXT,          -- tax article number
  conservatoria TEXT,             -- land registry office
  numero_descricao TEXT,          -- registry description number
  fracao TEXT,                    -- fraction (for apartments)

  -- Property characteristics
  area_total_m2 DOUBLE PRECISION,
  area_built_m2 DOUBLE PRECISION,
  num_bedrooms INTEGER,
  year_built INTEGER,
  condition TEXT CHECK (condition IN ('new', 'good', 'needs_renovation', 'ruin', 'unknown')),

  -- Valuation
  valor_patrimonial DECIMAL(12,2), -- tax valuation (VPT)
  estimated_market_value DECIMAL(12,2),

  -- Status
  status TEXT DEFAULT 'identified' CHECK (status IN ('identified', 'owner_found', 'contacted', 'interested', 'not_interested', 'sold', 'archived')),

  -- Source
  source TEXT,  -- how we found this property
  source_url TEXT,
  notes TEXT
);

-- Property owners
CREATE TABLE IF NOT EXISTS owners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Owner details
  owner_type TEXT NOT NULL CHECK (owner_type IN ('individual', 'company', 'estate', 'government', 'unknown')),
  name TEXT NOT NULL,
  nif TEXT,                       -- tax ID number (NIF)

  -- Contact info
  email TEXT,
  phone TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  country TEXT DEFAULT 'Portugal',

  -- Company details (if applicable)
  company_name TEXT,
  company_nif TEXT,

  -- GDPR
  gdpr_consent BOOLEAN DEFAULT FALSE,
  gdpr_consent_date TIMESTAMPTZ,
  opted_out BOOLEAN DEFAULT FALSE,
  opted_out_date TIMESTAMPTZ,

  notes TEXT
);

-- Link properties to owners (many-to-many)
CREATE TABLE IF NOT EXISTS property_owners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  ownership_share DECIMAL(5,2) DEFAULT 100.00,  -- percentage ownership
  is_primary_owner BOOLEAN DEFAULT TRUE,
  source TEXT,
  verified BOOLEAN DEFAULT FALSE,
  verified_date TIMESTAMPTZ,
  UNIQUE(property_id, owner_id)
);

-- Email campaigns
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  property_types TEXT[] DEFAULT '{}',   -- filter: which property types
  districts TEXT[] DEFAULT '{}',         -- filter: which districts
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_replied INTEGER DEFAULT 0
);

-- Individual email outreach records
CREATE TABLE IF NOT EXISTS outreach_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,

  -- Email details
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'replied', 'bounced', 'failed', 'opted_out')),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,

  -- Follow-up
  follow_up_count INTEGER DEFAULT 0,
  last_follow_up_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,

  error_message TEXT,
  notes TEXT
);

-- Activity log for tracking all interactions
CREATE TABLE IF NOT EXISTS outreach_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('email_sent', 'email_opened', 'email_replied', 'email_bounced', 'phone_call', 'meeting', 'offer_made', 'offer_accepted', 'offer_rejected', 'opted_out', 'note')),
  description TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_district ON properties(district);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_owners_email ON owners(email);
CREATE INDEX IF NOT EXISTS idx_owners_nif ON owners(nif);
CREATE INDEX IF NOT EXISTS idx_outreach_emails_status ON outreach_emails(status);
CREATE INDEX IF NOT EXISTS idx_outreach_emails_owner ON outreach_emails(owner_id);
CREATE INDEX IF NOT EXISTS idx_property_owners_property ON property_owners(property_id);
CREATE INDEX IF NOT EXISTS idx_property_owners_owner ON property_owners(owner_id);

-- Seed Portugal's 18 districts
INSERT INTO pt_districts (name, code) VALUES
  ('Aveiro', 'AVR'),
  ('Beja', 'BJA'),
  ('Braga', 'BRG'),
  ('Braganca', 'BGC'),
  ('Castelo Branco', 'CTB'),
  ('Coimbra', 'CBR'),
  ('Evora', 'EVR'),
  ('Faro', 'FAR'),
  ('Guarda', 'GRD'),
  ('Leiria', 'LRA'),
  ('Lisboa', 'LSB'),
  ('Portalegre', 'PTG'),
  ('Porto', 'PRT'),
  ('Santarem', 'STR'),
  ('Setubal', 'STB'),
  ('Viana do Castelo', 'VCT'),
  ('Vila Real', 'VRL'),
  ('Viseu', 'VSE')
ON CONFLICT (code) DO NOTHING;
