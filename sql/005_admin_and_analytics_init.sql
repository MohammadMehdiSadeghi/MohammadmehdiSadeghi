-- =============================================================================
-- Migration 005: Admin Configuration & Analytics Baseline
-- =============================================================================

-- 1. Insert Initial Admin Security Profile
-- Default Password hash (sha256 for root admin)
INSERT INTO admin_config (username, password_sha256, token_version, hmac_secret)
VALUES (
    'admin',
    '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', -- default: 'admin' (can be updated via dashboard)
    1,
    'a9f82d3e1b7c4a5f6e8d0c2b4a6e8f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e'
)
ON CONFLICT (username) DO NOTHING;

-- 2. Insert Baseline Seed Traffic (for dashboard initial view)
INSERT INTO site_visits (visit_date, visit_hour, page_path, country_code, session_id) VALUES
(CURRENT_DATE, 10, '/', 'IR', 'session-seed-01'),
(CURRENT_DATE, 11, '/project', 'US', 'session-seed-02'),
(CURRENT_DATE, 12, '/about', 'DE', 'session-seed-03'),
(CURRENT_DATE, 13, '/contact', 'GB', 'session-seed-04'),
(CURRENT_DATE, 14, '/', 'AE', 'session-seed-05'),
(CURRENT_DATE, 15, '/blog', 'CA', 'session-seed-06')
ON CONFLICT DO NOTHING;
