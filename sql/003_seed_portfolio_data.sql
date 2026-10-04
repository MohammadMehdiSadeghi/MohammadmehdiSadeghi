-- =============================================================================
-- Migration 003: Seed Portfolio Data (Skills, Projects, Site Profile)
-- =============================================================================

-- 1. Insert Skills
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

-- 2. Insert Web Projects
INSERT INTO projects (slug, title, description, category, project_type, url, github_url, display_order) VALUES
('sabzlearn', 'Sabzlearn Academy', 'Modern responsive educational academy web application with interactive courses and payment flows.', '["React", "Tailwind", "REST API"]'::jsonb, 'web', '/Projects/Web-Project/sabzlearn/index.html', 'https://github.com/MohammadmehdiSadeghi/sabzlearn', 1),
('rokad-college', 'Rokad College', 'Educational academy web platform with rich catalog and course management.', '["React", "Tailwind"]'::jsonb, 'web', '/Projects/Web-Project/rokad-college/index.html', 'https://github.com/MohammadmehdiSadeghi/rokad-college', 2),
('porskad-dist', 'Porskad Platform', 'Comprehensive web portal featuring interactive UI and streamlined user workflows.', '["React", "Vite", "Tailwind"]'::jsonb, 'web', '/Projects/Web-Project/porskad-dist/index.html', 'https://github.com/MohammadmehdiSadeghi/porskad-dist', 3)
ON CONFLICT (slug) DO NOTHING;

-- 3. Insert Mini Projects
INSERT INTO projects (slug, title, description, category, project_type, url, github_url, display_order) VALUES
('accordion', 'Accordion Component', 'Accessible and smooth accordion widget built with clean JavaScript.', '["JavaScript", "CSS"]'::jsonb, 'mini', '/Projects/Mini-Project/accordion/index.html', 'https://github.com/MohammadmehdiSadeghi/accordion', 1),
('audio-player', 'Custom Audio Player', 'Sleek custom audio player with waveform visualizer and playlist control.', '["JavaScript", "HTML5 Audio"]'::jsonb, 'mini', '/Projects/Mini-Project/audio-player/index.html', 'https://github.com/MohammadmehdiSadeghi/audio-player', 2),
('calculator', 'Smart Calculator', 'Scientific and standard interactive calculator with keyboard support.', '["JavaScript", "CSS"]'::jsonb, 'mini', '/Projects/Mini-Project/calculator/index.html', 'https://github.com/MohammadmehdiSadeghi/calculator', 3)
ON CONFLICT (slug) DO NOTHING;

-- 4. Insert Site Profile Setting
INSERT INTO site_settings (key, value) VALUES
('profile', '{
    "name": "Mohammadmehdi Sadeghi",
    "role": "Frontend & Full-Stack Developer",
    "bio": "Passionate developer focused on building ultra-fast, aesthetically pleasing, and secure web applications.",
    "email": "contact@mohammadmehdisadeghi.dev",
    "telegram": "https://t.me/MohammadmehdiSadeghi",
    "github": "https://github.com/MohammadmehdiSadeghi",
    "linkedin": "https://linkedin.com/in/mohammadmehdisadeghi"
}'::jsonb)
ON CONFLICT (key) DO NOTHING;
