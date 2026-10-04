-- =============================================================================
-- Migration 002: Analytics Aggregation Views
-- High-speed views for dashboard charts and metrics
-- =============================================================================

-- View 1: Daily Traffic & Unique Visitors
CREATE OR REPLACE VIEW view_daily_traffic AS
SELECT 
    visit_date,
    COUNT(*) AS total_page_views,
    COUNT(DISTINCT session_id) AS unique_visitors
FROM site_visits
GROUP BY visit_date
ORDER BY visit_date DESC;

-- View 2: Country / Geographic Traffic Distribution
CREATE OR REPLACE VIEW view_country_distribution AS
SELECT 
    country_code,
    COUNT(*) AS total_visits,
    COUNT(DISTINCT session_id) AS unique_visitors,
    ROUND((COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM site_visits), 0)) * 100, 2) AS percentage
FROM site_visits
GROUP BY country_code
ORDER BY total_visits DESC;

-- View 3: Popular Pages & Routes
CREATE OR REPLACE VIEW view_popular_pages AS
SELECT 
    page_path,
    COUNT(*) AS visit_count,
    COUNT(DISTINCT session_id) AS unique_visitors
FROM site_visits
GROUP BY page_path
ORDER BY visit_count DESC;

-- View 4: Top Clicked Elements & CTAs
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
