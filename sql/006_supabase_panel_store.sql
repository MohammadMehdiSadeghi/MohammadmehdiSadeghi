-- =============================================================================
-- Migration 006: SUPABASE PANEL STORE
-- Everything the admin panel saves, in ONE place that survives redeploys.
--
-- Paste this whole file into Supabase → SQL Editor → Run.
-- Safe to run more than once (idempotent: IF NOT EXISTS / ON CONFLICT).
--
-- What it fixes:
--   * Telegram bot token / chat id    -> admin_settings key='telegram'
--   * Site info (email, socials, …)   -> admin_settings key='site'
--   * Admin password hash             -> admin_settings key='admin_auth'
--   * Projects (web + mini)           -> projects
--   * Skills / badges                 -> skills
--   * Contact messages                -> contact_messages
--
-- The API reads/writes these tables through SUPABASE_DB_URL (or DATABASE_URL).
-- Without that env var the panel still works, but edits land in the throwaway
-- /tmp store and disappear on the next cold start — which is the bug you saw.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Extensions
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- 1. admin_settings — generic key/value store for everything the panel writes
--    as a single JSON document (telegram, site, password, future widgets).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_settings (
    key         VARCHAR(64) PRIMARY KEY,
    value       JSONB       NOT NULL DEFAULT '{}'::jsonb,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE admin_settings IS
    'Single-row-per-key JSON config written by the admin panel (telegram, site, admin_auth).';

-- updated_at should maintain itself, not depend on the API remembering.
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admin_settings_touch ON admin_settings;
CREATE TRIGGER trg_admin_settings_touch
    BEFORE UPDATE ON admin_settings
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- -----------------------------------------------------------------------------
-- 2. projects — was: public/api/projects.json + mini-projects.json
--    project_type distinguishes 'web' from 'mini' (was two separate files).
--    display_order keeps the manual drag-sort from the panel.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id            SERIAL PRIMARY KEY,
    slug          VARCHAR(120) UNIQUE,
    title         VARCHAR(200) NOT NULL,
    description   TEXT        NOT NULL DEFAULT '',
    category      JSONB       NOT NULL DEFAULT '[]'::jsonb,
    image_url     TEXT        NOT NULL DEFAULT '',
    url           TEXT        NOT NULL DEFAULT '',
    project_type  VARCHAR(20) NOT NULL DEFAULT 'web'
                  CHECK (project_type IN ('web', 'mini')),
    github_url    TEXT,
    display_order INT         NOT NULL DEFAULT 0,
    is_published  BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_type  ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_order ON projects(project_type, display_order);

DROP TRIGGER IF EXISTS trg_projects_touch ON projects;
CREATE TRIGGER trg_projects_touch
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- -----------------------------------------------------------------------------
-- 3. skills — was: public/api/skills.json  ([{id,name,img}])
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skills (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    icon_url      TEXT         NOT NULL DEFAULT '',
    display_order INT          NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_order ON skills(display_order);

-- -----------------------------------------------------------------------------
-- 4. contact_messages — was: data/messages.json ({messages:[],nextId})
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(120) NOT NULL,
    phone_number VARCHAR(40)  NOT NULL DEFAULT '',
    message      TEXT         NOT NULL,
    status       VARCHAR(20)  NOT NULL DEFAULT 'unseen'
                 CHECK (status IN ('unseen', 'seen', 'archived')),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_status  ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created ON contact_messages(created_at DESC);

-- -----------------------------------------------------------------------------
-- 5. Row Level Security
--
--    The API talks to Postgres with the SERVICE ROLE / direct connection,
--    which bypasses RLS. Enabling RLS with NO permissive policy for anon
--    means a leaked publishable (anon) key can read exactly nothing.
--    Admin traffic goes through the HMAC-protected API, never the anon key.
-- -----------------------------------------------------------------------------
ALTER TABLE admin_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills            ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages  ENABLE ROW LEVEL SECURITY;

-- Drop any stale policies so re-running this file is clean.
DROP POLICY IF EXISTS "public read published projects" ON projects;
DROP POLICY IF EXISTS "public read skills"             ON skills;
DROP POLICY IF EXISTS "public read settings"           ON admin_settings;
DROP POLICY IF EXISTS "public insert messages"         ON contact_messages;

-- Public (anon key) may READ what the portfolio renders publicly.
CREATE POLICY "public read published projects" ON projects
    FOR SELECT USING (is_published = TRUE);

CREATE POLICY "public read skills" ON skills
    FOR SELECT USING (TRUE);

-- NOTE: admin_settings is deliberately closed to anon — it holds the bot
-- token and the password hash. No policy => no anon access whatsoever.

-- The contact form is public, so anon may insert — but never read.
CREATE POLICY "public insert messages" ON contact_messages
    FOR INSERT WITH CHECK (TRUE);

-- -----------------------------------------------------------------------------
-- 6. Seed data pulled from the JSON files currently in the repo.
--    ON CONFLICT DO NOTHING means your existing rows are never overwritten.
-- -----------------------------------------------------------------------------

-- 6a. Telegram config (from data/telegram.json — token intentionally empty;
--     re-enter the bot token in the panel once, it will persist for good).
INSERT INTO admin_settings (key, value) VALUES (
    'telegram',
    '{"enabled": false, "botToken": "", "chatId": "8834580318"}'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- 6b. Site identity / social links (from public/api/site.json).
INSERT INTO admin_settings (key, value) VALUES (
    'site',
    '{
      "brand": "Mohammad-Mehdi-Sadeghi",
      "email": "mohammad.m.sadeghi09@gmail.com",
      "phone": "+989150669620",
      "phoneLabel": "+98 915 066 9620",
      "github": "https://github.com/MohammadMehdiSadeghi",
      "githubHandle": "MohammadMehdiSadeghi",
      "linkedin": "https://www.linkedin.com/in/mohammad-mehdi-sadeghi",
      "telegram": "https://t.me/Mohammad_sadeghi34",
      "telegramHandle": "Mohammad_sadeghi34",
      "instagram": "https://www.instagram.com/Mohammad_sadeghi3447",
      "instagramHandle": "Mohammad_sadeghi3447"
    }'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- 6c. Admin credentials (from data/config.json). Fill these in from .env.local
--     if you want the panel password to survive. Env vars win over this row.
INSERT INTO admin_settings (key, value) VALUES (
    'admin_auth',
    '{
      "username": "mohammad.m.sadeghi09@gmail.com",
      "password_sha256": "b5935771f43bbca6b350f841baa5ed7fb25fbaa8168ebdff549fa16295f46680",
      "token_version": 3
    }'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- 6d. Skills (from public/api/skills.json). No natural unique key, so guard
--     with NOT EXISTS to keep re-runs from duplicating rows.
INSERT INTO skills (name, icon_url, display_order)
SELECT v.name, v.icon_url, v.display_order
FROM (VALUES
    ('HTML',        '/assets/Images/html_1051277.png', 1),
    ('CSS',         '/assets/Images/css_919826.png',   2),
    ('JavaScript',  '/assets/Images/js_5968292.png',   3),
    ('React',       '/assets/Images/react.png',        4),
    ('Tailwind CSS','/assets/Images/tailwind.png',     5),
    ('TypeScript',  '/assets/Images/typescript.png',   6),
    ('WordPress',   '/assets/Images/wordpress_174881.png', 7)
) AS v(name, icon_url, display_order)
WHERE NOT EXISTS (SELECT 1 FROM skills s WHERE s.name = v.name);

-- projects has NO unique key on title, so a bare ON CONFLICT would never
-- fire and re-running this file would duplicate every row. Guard each insert
-- with a NOT EXISTS check on (project_type, title) instead.
INSERT INTO projects (title, description, category, image_url, project_type, url, display_order)
SELECT v.title, v.description, v.category, v.image_url, v.project_type, v.url, v.display_order
FROM (VALUES
    ('Ubisoft', 'A responsive clone of the Ubisoft website built with HTML, CSS, and JavaScript, featuring a modern UI, interactive sections, and smooth user experience.', '["HTML","CSS","JavaScript"]'::jsonb, '/assets/previews/Ubisoft.png', 'web', '', 1),
    ('DigiKala', 'A responsive clone of the DigiKala e-commerce website built with HTML, CSS, and JavaScript, including product listings, navigation, and a clean shopping interface.', '["HTML","CSS","JavaScript"]'::jsonb, '/assets/previews/Digikala.png', 'web', '', 2),
    ('Sabz Learn', 'A modern online learning platform inspired by Sabz Learn, built with React and Tailwind CSS, featuring course browsing, reusable components, responsive design, and a clean user experience.', '["React","Tailwind"]'::jsonb, '/assets/previews/Sabz-Learn.png', 'web', '', 3),
    ('Todo App', 'A task management application built with React and Tailwind CSS, allowing users to create, organize, edit, and track daily tasks through a clean and responsive interface.', '["React","Tailwind"]'::jsonb, '/assets/previews/Todo-App.png', 'web', '', 4),
    ('Study Timer', 'A study tracker and exam countdown app built with Next.js, React, and Supabase. Features task management, study session tracking, and a clean modern interface.', '["Next.js","React","Supabase"]'::jsonb, '/assets/previews/konkortimer.png', 'web', '', 5),
    ('Porskad', 'Porskad — a dedicated form and survey management system for educational institutes. Built with React, Tailwind CSS, and Framer Motion, featuring an interactive admin dashboard, embeddable forms, and a responsive UI.', '["React","Tailwind","JavaScript"]'::jsonb, '/assets/previews/porskad.png', 'web', '', 6),
    ('Rokad College', 'Rokad College — a modern online learning platform landing page built with React 18, Tailwind CSS, and Swiper. Features hero sections, course pillars, statistics, and responsive design.', '["React","Tailwind","JavaScript"]'::jsonb, '/assets/previews/rokad-college.png', 'web', '', 7),
    ('Rokad Web', 'Rokad — a modern creative web design studio site built with Next.js 14, Tailwind CSS, and Framer Motion. Features portfolio showcase, honors, about, and responsive pages.', '["Next.js","React","Tailwind"]'::jsonb, '/assets/previews/rokad-web.png', 'web', '', 8)
) AS v(title, description, category, image_url, project_type, url, display_order)
WHERE NOT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.project_type = v.project_type AND p.title = v.title
);

-- 6f. Mini projects (from public/api/mini-projects.json).
INSERT INTO projects (slug, title, description, category, image_url, project_type, url, display_order)
SELECT v.slug, v.title, v.description, v.category, v.image_url, v.project_type, v.url, v.display_order
FROM (VALUES
    ('calculator', 'Calculator', 'A clean, responsive calculator built with React. Features basic arithmetic operations, keyboard support, and a modern minimal UI design.', '["React"]'::jsonb, '/assets/previews/Calculator.png', 'mini', '../Projects/Mini-Project/Calculator/index.html', 1),
    ('timer', 'Timer', 'A countdown and stopwatch timer with start, pause, and reset controls. Built with clean HTML, CSS, and vanilla JavaScript.', '["JavaScript","HTML","CSS"]'::jsonb, '/assets/previews/timer.png', 'mini', '../Projects/Mini-Project/timer/index.html', 2)
) AS v(slug, title, description, category, image_url, project_type, url, display_order)
WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.slug = v.slug);

-- -----------------------------------------------------------------------------
-- 7. Verify
-- -----------------------------------------------------------------------------
-- SELECT key, jsonb_pretty(value) FROM admin_settings ORDER BY key;
-- SELECT id, project_type, title, display_order FROM projects ORDER BY project_type, display_order;
-- SELECT id, name, display_order FROM skills ORDER BY display_order;
-- SELECT id, name, status, created_at FROM contact_messages ORDER BY created_at DESC LIMIT 20;
