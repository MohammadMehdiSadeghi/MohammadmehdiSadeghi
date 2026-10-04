-- =============================================================================
-- Portfolio & Analytics Relational Database Schema
-- Compatible with: PostgreSQL 14+, MySQL 8+, SQLite 3
-- =============================================================================

-- 1. Table: Analytics Page Visits
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

-- 2. Table: Analytics Interactive Clicks
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

-- 3. Table: Contact Messages Inbox
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

-- 4. Table: Portfolio Projects
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    category JSONB NOT NULL DEFAULT '[]'::jsonb,
    image_url TEXT,
    project_type VARCHAR(30) NOT NULL DEFAULT 'web' CHECK (project_type IN ('web', 'mini')),
    github_url TEXT,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Table: Blog Articles
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

-- 6. Table: Developer Skills
CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    icon_url TEXT NOT NULL,
    display_order INT DEFAULT 0
);

-- 7. Table: Admin Configuration & Authentication
CREATE TABLE IF NOT EXISTS admin_config (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_sha256 VARCHAR(64) NOT NULL,
    token_version INT NOT NULL DEFAULT 1,
    hmac_secret VARCHAR(64) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- Analytics Aggregation Views for High-Speed Admin Dashboard
-- =============================================================================

-- View: Daily Visits & Unique Sessions
CREATE OR REPLACE VIEW view_daily_traffic AS
SELECT 
    visit_date,
    COUNT(*) AS total_page_views,
    COUNT(DISTINCT session_id) AS unique_visitors
FROM site_visits
GROUP BY visit_date
ORDER BY visit_date DESC;

-- View: Top Clicked Elements & CTAs
CREATE OR REPLACE VIEW view_popular_clicks AS
SELECT 
    target_id,
    target_type,
    target_label,
    COUNT(*) AS click_count
FROM site_clicks
GROUP BY target_id, target_type, target_label
ORDER BY click_count DESC;
