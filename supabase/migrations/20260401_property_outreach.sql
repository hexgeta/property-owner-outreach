-- Portugal Property Cold Email Outreach Schema
-- With multi-tenant auth and Stripe billing

-- =============================================
-- USER PROFILES (extends Supabase auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  company_name TEXT,

  -- Stripe
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('inactive', 'trialing', 'active', 'past_due', 'canceled')),
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),

  -- Limits
  monthly_email_limit INTEGER DEFAULT 50,   -- free/trial limit
  emails_sent_this_month INTEGER DEFAULT 0,
  current_period_start TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- CONTACTS (property owners to reach out to)
-- =============================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Person
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  nif TEXT,

  -- Property info
  property_type TEXT DEFAULT 'land' CHECK (property_type IN ('villa', 'land', 'farm', 'ruin')),
  district TEXT,
  municipality TEXT,
  parish TEXT,
  property_address TEXT,
  area_m2 DOUBLE PRECISION,
  estimated_value DECIMAL(12,2),

  -- Pipeline
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'opened', 'replied', 'interested', 'not_interested', 'deal_closed', 'opted_out')),

  -- GDPR
  opted_out BOOLEAN DEFAULT FALSE,
  opted_out_date TIMESTAMPTZ,

  -- Tracking
  emails_sent INTEGER DEFAULT 0,
  last_emailed_at TIMESTAMPTZ,
  last_replied_at TIMESTAMPTZ,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  source TEXT
);

-- =============================================
-- EMAIL TEMPLATES
-- =============================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL = system template
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  property_type TEXT,
  is_follow_up BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0
);

-- =============================================
-- SENT EMAILS LOG
-- =============================================
CREATE TABLE IF NOT EXISTS sent_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'replied', 'bounced', 'failed')),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  error_message TEXT
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sent_emails ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read/update their own
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Contacts: users can only CRUD their own
CREATE POLICY "Users can view own contacts" ON contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON contacts FOR DELETE USING (auth.uid() = user_id);

-- Email templates: users see system templates + their own
CREATE POLICY "Users can view templates" ON email_templates FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users can insert own templates" ON email_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON email_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates" ON email_templates FOR DELETE USING (auth.uid() = user_id);

-- Sent emails: users can only see their own
CREATE POLICY "Users can view own sent emails" ON sent_emails FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sent emails" ON sent_emails FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_district ON contacts(district);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_sent_emails_user ON sent_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_contact ON sent_emails(contact_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_status ON sent_emails(status);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe ON profiles(stripe_customer_id);

-- =============================================
-- SEED SYSTEM EMAIL TEMPLATES (user_id = NULL)
-- =============================================
INSERT INTO email_templates (user_id, name, subject, body_html, body_text, property_type, is_follow_up, sort_order) VALUES
(
  NULL,
  'Villa - First Contact',
  'Interesse na sua moradia em {district}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <p>Exmo(a). Sr(a). <strong>{name}</strong>,</p>
  <p>O meu nome e <strong>{sender_name}</strong> e estou a contacta-lo(a) porque tenho interesse em adquirir moradias na zona de <strong>{district}</strong>.</p>
  <p>Gostaria de saber se teria interesse em considerar uma proposta de compra para a sua propriedade. Ofereco um <strong>valor justo de mercado</strong> e um processo rapido e sem complicacoes.</p>
  <p>Se tiver interesse, por favor responda a este email ou ligue para <strong>{sender_phone}</strong>.</p>
  <p>Com os melhores cumprimentos,<br/><strong>{sender_name}</strong><br/>{sender_phone}</p>
  <hr style="margin-top: 30px; border: none; border-top: 1px solid #ccc;"/>
  <p style="font-size: 11px; color: #999;">Para deixar de receber estas mensagens, responda com "REMOVER" no assunto.</p>
</div>',
  'Exmo(a). Sr(a). {name},

O meu nome e {sender_name} e estou a contacta-lo(a) porque tenho interesse em adquirir moradias na zona de {district}.

Gostaria de saber se teria interesse em considerar uma proposta de compra para a sua propriedade. Ofereco um valor justo de mercado e um processo rapido e sem complicacoes.

Se tiver interesse, por favor responda a este email ou ligue para {sender_phone}.

Com os melhores cumprimentos,
{sender_name}
{sender_phone}

---
Para deixar de receber estas mensagens, responda com "REMOVER" no assunto.',
  'villa', FALSE, 1
),
(
  NULL,
  'Land - First Contact',
  'Interesse no seu terreno em {district}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <p>Exmo(a). Sr(a). <strong>{name}</strong>,</p>
  <p>Contacto-o(a) porque estou interessado(a) na aquisicao de terrenos na zona de <strong>{district}</strong>.</p>
  <p>Identifiquei que possui um terreno nesta regiao e gostaria de saber se estaria disposto(a) a vende-lo. Ofereco <strong>condicoes competitivas</strong> e trato de toda a burocracia.</p>
  <p>Caso tenha interesse, agradeco que me contacte.</p>
  <p>Cumprimentos,<br/><strong>{sender_name}</strong><br/>{sender_phone}</p>
  <hr style="margin-top: 30px; border: none; border-top: 1px solid #ccc;"/>
  <p style="font-size: 11px; color: #999;">Para deixar de receber estas mensagens, responda com "REMOVER".</p>
</div>',
  'Exmo(a). Sr(a). {name},

Contacto-o(a) porque estou interessado(a) na aquisicao de terrenos na zona de {district}.

Identifiquei que possui um terreno nesta regiao e gostaria de saber se estaria disposto(a) a vende-lo. Ofereco condicoes competitivas e trato de toda a burocracia.

Caso tenha interesse, agradeco que me contacte.

Cumprimentos,
{sender_name}
{sender_phone}

---
Para deixar de receber estas mensagens, responda com "REMOVER".',
  'land', FALSE, 2
),
(
  NULL,
  'Follow-up',
  'Re: Interesse na sua propriedade em {district}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <p>Exmo(a). Sr(a). <strong>{name}</strong>,</p>
  <p>Enviei-lhe uma mensagem ha alguns dias sobre a sua propriedade em <strong>{district}</strong> e gostaria de saber se teve oportunidade de considerar.</p>
  <p>Compreendo que e uma decisao importante. Estou disponivel para esclarecer qualquer duvida — podemos marcar uma chamada ou reuniao presencial.</p>
  <p>Aguardo a sua resposta.</p>
  <p>Cumprimentos,<br/><strong>{sender_name}</strong><br/>{sender_phone}</p>
  <hr style="margin-top: 30px; border: none; border-top: 1px solid #ccc;"/>
  <p style="font-size: 11px; color: #999;">Para deixar de receber estas mensagens, responda com "REMOVER".</p>
</div>',
  'Exmo(a). Sr(a). {name},

Enviei-lhe uma mensagem ha alguns dias sobre a sua propriedade em {district} e gostaria de saber se teve oportunidade de considerar.

Compreendo que e uma decisao importante. Estou disponivel para esclarecer qualquer duvida — podemos marcar uma chamada ou reuniao presencial.

Aguardo a sua resposta.

Cumprimentos,
{sender_name}
{sender_phone}

---
Para deixar de receber estas mensagens, responda com "REMOVER".',
  NULL, TRUE, 3
),
(
  NULL,
  'Farm/Quinta - First Contact',
  'Interesse na sua quinta em {district}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <p>Exmo(a). Sr(a). <strong>{name}</strong>,</p>
  <p>Estou a contacta-lo(a) porque procuro quintas na regiao de <strong>{district}</strong> e soube que possui uma propriedade nesta zona.</p>
  <p>Teria interesse em conversar sobre uma possivel venda? Garanto um processo simples e um <strong>valor justo</strong>.</p>
  <p>Fico a aguardar o seu contacto.</p>
  <p>Cumprimentos,<br/><strong>{sender_name}</strong><br/>{sender_phone}</p>
  <hr style="margin-top: 30px; border: none; border-top: 1px solid #ccc;"/>
  <p style="font-size: 11px; color: #999;">Para deixar de receber estas mensagens, responda com "REMOVER".</p>
</div>',
  'Exmo(a). Sr(a). {name},

Estou a contacta-lo(a) porque procuro quintas na regiao de {district} e soube que possui uma propriedade nesta zona.

Teria interesse em conversar sobre uma possivel venda? Garanto um processo simples e um valor justo.

Fico a aguardar o seu contacto.

Cumprimentos,
{sender_name}
{sender_phone}

---
Para deixar de receber estas mensagens, responda com "REMOVER".',
  'farm', FALSE, 4
);
