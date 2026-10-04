-- =============================================================================
-- Migration 004: Music Catalog & Dimensional Mood Database
-- =============================================================================

CREATE TABLE IF NOT EXISTS music_tracks (
    id INT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    artist VARCHAR(120) NOT NULL,
    audio_path TEXT NOT NULL,
    cover_image TEXT,
    mood_dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
    acoustic_features JSONB NOT NULL DEFAULT '{}'::jsonb,
    lyrics_snippets TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_music_artist ON music_tracks(artist);
CREATE INDEX IF NOT EXISTS idx_music_title ON music_tracks(title);

ALTER TABLE music_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view music tracks" ON music_tracks FOR SELECT USING (true);

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
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    artist = EXCLUDED.artist,
    audio_path = EXCLUDED.audio_path,
    mood_dimensions = EXCLUDED.mood_dimensions,
    acoustic_features = EXCLUDED.acoustic_features;
