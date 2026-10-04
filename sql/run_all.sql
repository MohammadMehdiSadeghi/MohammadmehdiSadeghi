-- =============================================================================
-- COMPLETE UNIFIED SQL RUNNER (001 to 005)
-- Run this single file if you prefer to execute everything in one command.
-- =============================================================================

-- >>> 001: Core Tables <<<
CREATE TABLE IF NOT EXISTS site_visits (
    id BIGSERIAL PRIMARY KEY,
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    visit_hour SMALLINT NOT NULL CHECK (visit_hour BETWEEN 0 AND 23),
    page_path VARCHAR(255) NOT NULL DEFAULT '/',
    country_code VARCHAR(10) NOT NULL DEFAULT 'UNKNOWN',
    session_id VARCHAR(128) NOT NULL,
    ip_hash VARCHAR(64),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visits_date ON site_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_visits_session ON site_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_visits_path ON site_visits(page_path);
CREATE INDEX IF NOT EXISTS idx_visits_country ON site_visits(country_code);

CREATE TABLE IF NOT EXISTS site_clicks (
    id BIGSERIAL PRIMARY KEY,
    target_id VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_label VARCHAR(150),
    page_path VARCHAR(255) NOT NULL DEFAULT '/',
    session_id VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clicks_target ON site_clicks(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_clicks_created ON site_clicks(created_at);

CREATE TABLE IF NOT EXISTS contact_messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    phone_number VARCHAR(30),
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'unseen' CHECK (status IN ('unseen', 'seen', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created ON contact_messages(created_at);

CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    category JSONB NOT NULL DEFAULT '[]'::jsonb,
    image_url TEXT,
    project_type VARCHAR(30) NOT NULL DEFAULT 'web' CHECK (project_type IN ('web', 'mini')),
    url TEXT,
    github_url TEXT,
    display_order INT DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_order ON projects(display_order);

CREATE TABLE IF NOT EXISTS blog_posts (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(150) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    cover_image TEXT,
    cover_alt TEXT,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_published BOOLEAN NOT NULL DEFAULT true,
    published_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blog_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_published ON blog_posts(is_published, published_date);

CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    icon_url TEXT NOT NULL,
    display_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS site_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(80) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_config (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_sha256 VARCHAR(64) NOT NULL,
    token_version INT NOT NULL DEFAULT 1,
    hmac_secret VARCHAR(64) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- >>> Row Level Security (RLS) <<<
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published projects" ON projects FOR SELECT USING (is_published = true);
CREATE POLICY "Public can view published blog posts" ON blog_posts FOR SELECT USING (is_published = true);
CREATE POLICY "Public can view skills" ON skills FOR SELECT USING (true);
CREATE POLICY "Public can view site settings" ON site_settings FOR SELECT USING (true);

CREATE POLICY "Public can insert visits" ON site_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can insert clicks" ON site_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can submit contact messages" ON contact_messages FOR INSERT WITH CHECK (true);

-- >>> 002: Views <<<
CREATE OR REPLACE VIEW view_daily_traffic AS
SELECT 
    visit_date,
    COUNT(*) AS total_page_views,
    COUNT(DISTINCT session_id) AS unique_visitors
FROM site_visits
GROUP BY visit_date
ORDER BY visit_date DESC;

CREATE OR REPLACE VIEW view_country_distribution AS
SELECT 
    country_code,
    COUNT(*) AS total_visits,
    COUNT(DISTINCT session_id) AS unique_visitors,
    ROUND((COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM site_visits), 0)) * 100, 2) AS percentage
FROM site_visits
GROUP BY country_code
ORDER BY total_visits DESC;

CREATE OR REPLACE VIEW view_popular_pages AS
SELECT 
    page_path,
    COUNT(*) AS visit_count,
    COUNT(DISTINCT session_id) AS unique_visitors
FROM site_visits
GROUP BY page_path
ORDER BY visit_count DESC;

CREATE OR REPLACE VIEW view_popular_clicks AS
SELECT 
    target_id,
    target_type,
    target_label,
    COUNT(*) AS click_count,
    COUNT(DISTINCT session_id) AS unique_clickers
FROM site_clicks
GROUP BY target_id, target_type, target_label
ORDER BY click_count DESC;

-- >>> 003: Seed Data <<<
INSERT INTO skills (name, icon_url, display_order) VALUES
('HTML5', '/assets/icon/skills/html5.svg', 1),
('CSS3', '/assets/icon/skills/css.svg', 2),
('JavaScript', '/assets/icon/skills/javascript.svg', 3),
('React', '/assets/icon/skills/react.svg', 4),
('Next.js', '/assets/icon/skills/nextjs.svg', 5),
('Tailwind CSS', '/assets/icon/skills/tailwind.svg', 6),
('Node.js', '/assets/icon/skills/nodejs.svg', 7),
('Express', '/assets/icon/skills/express.svg', 8),
('Git & GitHub', '/assets/icon/skills/git.svg', 9),
('TypeScript', '/assets/icon/skills/typescript.svg', 10)
ON CONFLICT DO NOTHING;

INSERT INTO projects (slug, title, description, category, project_type, url, github_url, display_order) VALUES
('sabzlearn', 'Sabzlearn Academy', 'Modern responsive educational academy web application with interactive courses and payment flows.', '["React", "Tailwind", "REST API"]'::jsonb, 'web', '/Projects/Web-Project/sabzlearn/index.html', 'https://github.com/MohammadmehdiSadeghi/sabzlearn', 1),
('rokad-college', 'Rokad College', 'Educational academy web platform with rich catalog and course management.', '["React", "Tailwind"]'::jsonb, 'web', '/Projects/Web-Project/rokad-college/index.html', 'https://github.com/MohammadmehdiSadeghi/rokad-college', 2),
('porskad-dist', 'Porskad Platform', 'Comprehensive web portal featuring interactive UI and streamlined user workflows.', '["React", "Vite", "Tailwind"]'::jsonb, 'web', '/Projects/Web-Project/porskad-dist/index.html', 'https://github.com/MohammadmehdiSadeghi/porskad-dist', 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO projects (slug, title, description, category, project_type, url, github_url, display_order) VALUES
('accordion', 'Accordion Component', 'Accessible and smooth accordion widget built with clean JavaScript.', '["JavaScript", "CSS"]'::jsonb, 'mini', '/Projects/Mini-Project/accordion/index.html', 'https://github.com/MohammadmehdiSadeghi/accordion', 1),
('audio-player', 'Custom Audio Player', 'Sleek custom audio player with waveform visualizer and playlist control.', '["JavaScript", "HTML5 Audio"]'::jsonb, 'mini', '/Projects/Mini-Project/audio-player/index.html', 'https://github.com/MohammadmehdiSadeghi/audio-player', 2),
('calculator', 'Smart Calculator', 'Scientific and standard interactive calculator with keyboard support.', '["JavaScript", "CSS"]'::jsonb, 'mini', '/Projects/Mini-Project/calculator/index.html', 'https://github.com/MohammadmehdiSadeghi/calculator', 3)
ON CONFLICT (slug) DO NOTHING;

-- >>> 004: Music Database <<<
CREATE TABLE IF NOT EXISTS music_tracks (
    id INT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    artist VARCHAR(120) NOT NULL,
    audio_path TEXT NOT NULL,
    cover_image TEXT,
    mood_dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
    acoustic_features JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO music_tracks (id, title, artist, audio_path, cover_image, mood_dimensions, acoustic_features) VALUES
(1, 'Without Me', 'Eminem', '/assets/Music/Without Me.mp3', '', '{"energy": 0.95, "euphoria": 0.85, "playfulness": 0.9, "power": 0.88}'::jsonb, '{"bpm": 112, "valence": 0.85}'::jsonb),
(2, 'Skyfall', 'Adele', '/assets/Music/Skyfall.mp3', '', '{"darkness": 0.88, "melancholy": 0.85, "power": 0.9, "tension": 0.85}'::jsonb, '{"bpm": 76, "valence": 0.35}'::jsonb),
(3, 'Set Fire to the Rain', 'Adele', '/assets/Music/Set Fire to the Rain.mp3', '', '{"heartbreak": 0.9, "power": 0.92, "sadness": 0.85}'::jsonb, '{"bpm": 108, "valence": 0.45}'::jsonb),
(4, 'Someone Like You', 'Adele', '/assets/Music/Someone Like You.mp3', '', '{"heartbreak": 0.98, "longing": 0.92, "sadness": 0.95}'::jsonb, '{"bpm": 67, "valence": 0.28}'::jsonb),
(5, 'The Winner Takes It All', 'ABBA', '/assets/Music/The Winner Takes It All.mp3', '', '{"heartbreak": 0.92, "nostalgia": 0.9, "sadness": 0.85}'::jsonb, '{"bpm": 127, "valence": 0.55}'::jsonb),
(6, 'Gimme! Gimme! Gimme!', 'ABBA', '/assets/Music/Gimme! Gimme! Gimme!.mp3', '', '{"energy": 0.92, "euphoria": 0.88, "longing": 0.75}'::jsonb, '{"bpm": 120, "valence": 0.8}'::jsonb),
(7, 'Lovely', 'Billie Eilish & Khalid', '/assets/Music/Lovely.mp3', '', '{"calm": 0.8, "darkness": 0.85, "loneliness": 0.92, "melancholy": 0.95}'::jsonb, '{"bpm": 115, "valence": 0.2}'::jsonb),
(8, 'Everything I Wanted', 'Billie Eilish', '/assets/Music/Everything I Wanted.mp3', '', '{"calm": 0.85, "dreaminess": 0.9, "reflection": 0.9, "warmth": 0.8}'::jsonb, '{"bpm": 120, "valence": 0.35}'::jsonb),
(9, 'As It Was', 'Harry Styles', '/assets/Music/As It Was.mp3', '', '{"energy": 0.85, "loneliness": 0.75, "nostalgia": 0.88}'::jsonb, '{"bpm": 174, "valence": 0.7}'::jsonb),
(10, 'Falling', 'Harry Styles', '/assets/Music/Falling.mp3', '', '{"heartbreak": 0.95, "loneliness": 0.9, "melancholy": 0.92, "sadness": 0.92}'::jsonb, '{"bpm": 80, "valence": 0.25}'::jsonb),
(11, 'Summertime Sadness', 'Lana Del Rey', '/assets/Music/Summertime Sadness.mp3', '', '{"dreaminess": 0.85, "melancholy": 0.92, "nostalgia": 0.9, "sensuality": 0.8}'::jsonb, '{"bpm": 112, "valence": 0.45}'::jsonb),
(12, 'Young and Beautiful', 'Lana Del Rey', '/assets/Music/Young and Beautiful.mp3', '', '{"dreaminess": 0.95, "longing": 0.9, "romance": 0.92, "warmth": 0.85}'::jsonb, '{"bpm": 114, "valence": 0.4}'::jsonb),
(13, 'Hips Don''t Lie', 'Shakira', '/assets/Music/Hips Don''t Lie.mp3', '', '{"energy": 0.98, "euphoria": 0.92, "playfulness": 0.9, "sensuality": 0.95}'::jsonb, '{"bpm": 100, "valence": 0.9}'::jsonb),
(14, 'Billie Jean', 'Michael Jackson', '/assets/Music/Billie Jean.mp3', '', '{"energy": 0.9, "mystery": 0.85, "power": 0.88, "tension": 0.82}'::jsonb, '{"bpm": 117, "valence": 0.75}'::jsonb),
(15, 'Smooth Criminal', 'Michael Jackson', '/assets/Music/Smooth Criminal.mp3', '', '{"energy": 0.98, "power": 0.92, "tension": 0.95}'::jsonb, '{"bpm": 118, "valence": 0.7}'::jsonb),
(16, 'Blinding Lights', 'The Weeknd', '/assets/Music/Blinding Lights.mp3', '', '{"energy": 0.98, "euphoria": 0.9, "longing": 0.78, "nostalgia": 0.85}'::jsonb, '{"bpm": 171, "valence": 0.65}'::jsonb),
(17, 'Starboy', 'The Weeknd', '/assets/Music/Starboy.mp3', '', '{"darkness": 0.8, "energy": 0.9, "power": 0.92}'::jsonb, '{"bpm": 186, "valence": 0.6}'::jsonb),
(18, 'Believer', 'Imagine Dragons', '/assets/Music/Believer.mp3', '', '{"defiance": 0.95, "energy": 0.98, "power": 0.98, "rebellion": 0.88}'::jsonb, '{"bpm": 125, "valence": 0.75}'::jsonb),
(19, 'Demons', 'Imagine Dragons', '/assets/Music/Demons.mp3', '', '{"darkness": 0.88, "hope": 0.8, "melancholy": 0.85, "power": 0.85}'::jsonb, '{"bpm": 90, "valence": 0.45}'::jsonb),
(20, 'Blank Space', 'Taylor Swift', '/assets/Music/Blank Space.mp3', '', '{"energy": 0.88, "playfulness": 0.92, "power": 0.85, "sensuality": 0.8}'::jsonb, '{"bpm": 96, "valence": 0.8}'::jsonb),
(21, 'Shake It Off', 'Taylor Swift', '/assets/Music/Shake It Off.mp3', '', '{"defiance": 0.85, "energy": 0.98, "euphoria": 0.95, "joy": 0.98}'::jsonb, '{"bpm": 160, "valence": 0.95}'::jsonb),
(22, 'Je Veux', 'ZAZ', '/assets/Music/Je Veux.mp3', '', '{"defiance": 0.85, "energy": 0.9, "joy": 0.95, "playfulness": 0.92}'::jsonb, '{"bpm": 154, "valence": 0.9}'::jsonb),
(23, 'Cornfield Chase', 'Hans Zimmer', '/assets/Music/Cornfield Chase.mp3', '', '{"dreaminess": 0.95, "hope": 0.92, "power": 0.95, "reflection": 0.92, "tension": 0.85}'::jsonb, '{"bpm": 96, "valence": 0.5}'::jsonb),
(24, 'Amour plastique', 'Videoclub', '/assets/Music/Amour plastique.mp3', '', '{"dreaminess": 0.9, "nostalgia": 0.92, "romance": 0.95, "warmth": 0.88}'::jsonb, '{"bpm": 124, "valence": 0.75}'::jsonb),
(25, 'Cigarettes out the Window', 'TV Girl', '/assets/Music/Cigarettes out the Window.mp3', '', '{"melancholy": 0.88, "nostalgia": 0.92, "reflection": 0.85}'::jsonb, '{"bpm": 118, "valence": 0.55}'::jsonb),
(26, 'Counting Stars', 'OneRepublic', '/assets/Music/Counting Stars.mp3', '', '{"energy": 0.95, "euphoria": 0.9, "hope": 0.88, "joy": 0.85}'::jsonb, '{"bpm": 122, "valence": 0.8}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- >>> 005: Admin Baseline <<<
INSERT INTO admin_config (username, password_sha256, token_version, hmac_secret)
VALUES (
    'admin',
    '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
    1,
    'a9f82d3e1b7c4a5f6e8d0c2b4a6e8f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e'
)
ON CONFLICT (username) DO NOTHING;
