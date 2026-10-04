# Database Migrations & SQL Execution Guide

This folder contains numbered, sequential SQL migrations for deploying the complete relational database schema, analytics views, portfolio projects, music mood catalog, and initial configurations.

---

## Execution Order (Run Step-by-Step)

You can run each file sequentially in order using any database client (PostgreSQL, Supabase SQL Editor, Neon, DBeaver, pgAdmin, MySQL):

1. **[`001_create_tables.sql`](file:///c:/Users/Mohammad/Documents/GitHub/MohammadmehdiSadeghi/sql/001_create_tables.sql)**
   * Creates all core tables: `site_visits` (with `country_code`), `site_clicks`, `contact_messages`, `projects`, `blog_posts`, `skills`, `site_settings`, `admin_config`.
   * Sets up performance indexes.

2. **[`002_create_views.sql`](file:///c:/Users/Mohammad/Documents/GitHub/MohammadmehdiSadeghi/sql/002_create_views.sql)**
   * Creates high-speed analytics aggregation views: `view_daily_traffic`, `view_country_distribution`, `view_popular_pages`, `view_popular_clicks`.

3. **[`003_seed_portfolio_data.sql`](file:///c:/Users/Mohammad/Documents/GitHub/MohammadmehdiSadeghi/sql/003_seed_portfolio_data.sql)**
   * Seeds developer skills, published web & mini projects, and profile settings.

4. **[`004_music_catalog.sql`](file:///c:/Users/Mohammad/Documents/GitHub/MohammadmehdiSadeghi/sql/004_music_catalog.sql)**
   * Creates `music_tracks` table and seeds full metadata, emotion dimensions, and local audio paths for all tracks.

5. **[`005_admin_and_analytics_init.sql`](file:///c:/Users/Mohammad/Documents/GitHub/MohammadmehdiSadeghi/sql/005_admin_and_analytics_init.sql)**
   * Seeds default admin security hash and initial baseline analytics.

---

## Option 2: Run All-In-One Script

If you prefer to execute everything in a single query:
* Execute **[`run_all.sql`](file:///c:/Users/Mohammad/Documents/GitHub/MohammadmehdiSadeghi/sql/run_all.sql)**.
