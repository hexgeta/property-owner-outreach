-- Portugal Property Cold Email Outreach Schema
-- Focused on: import contacts, send emails, track pipeline

-- Contacts (property owners you want to reach)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Person
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  nif TEXT,                        -- Portuguese tax ID

  -- Property info (what they own)
  property_type TEXT DEFAULT 'land' CHECK (property_type IN ('villa', 'land', 'farm', 'ruin')),
  district TEXT,
  municipality TEXT,
  parish TEXT,
  property_address TEXT,
  area_m2 DOUBLE PRECISION,
  estimated_value DECIMAL(12,2),

  -- Pipeline status
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

  -- Source of this contact
  source TEXT
);

-- Email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  property_type TEXT,  -- optional: template for specific property type
  is_follow_up BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0
);

-- Sent emails log
CREATE TABLE IF NOT EXISTS sent_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_district ON contacts(district);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_opted_out ON contacts(opted_out);
CREATE INDEX IF NOT EXISTS idx_sent_emails_contact ON sent_emails(contact_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_status ON sent_emails(status);

-- Seed default Portuguese email templates
INSERT INTO email_templates (name, subject, body_html, body_text, property_type, is_follow_up, sort_order) VALUES
(
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
  'villa',
  FALSE,
  1
),
(
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
  'land',
  FALSE,
  2
),
(
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
  NULL,
  TRUE,
  3
),
(
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
  'farm',
  FALSE,
  4
);
