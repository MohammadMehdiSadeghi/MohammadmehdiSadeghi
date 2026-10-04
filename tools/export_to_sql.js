import fs from 'fs';
import path from 'path';

const DATA_DIR = './data';
const PUBLIC_API = './public/api';

function safeRead(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e.message);
  }
  return fallback;
}

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

console.log('Generating SQL export from JSON data stores...');
const output = [];

// 1. Export Messages
const messagesStore = safeRead(path.join(DATA_DIR, 'messages.json'), { messages: [] });
const messages = Array.isArray(messagesStore.messages) ? messagesStore.messages : [];
if (messages.length) {
  output.push('-- Insert Contact Messages');
  messages.forEach(m => {
    output.push(`INSERT INTO contact_messages (name, phone_number, message, status, created_at) VALUES (${escapeSql(m.name)}, ${escapeSql(m.phoneNumber)}, ${escapeSql(m.message)}, ${escapeSql(m.status || 'unseen')}, ${escapeSql(m.date || new Date().toISOString())});`);
  });
}

// 2. Export Projects
const projects = safeRead(path.join(PUBLIC_API, 'projects.json'), []);
if (Array.isArray(projects) && projects.length) {
  output.push('\n-- Insert Main Projects');
  projects.forEach(p => {
    output.push(`INSERT INTO projects (title, description, category, image_url, project_type, github_url) VALUES (${escapeSql(p.title)}, ${escapeSql(p.description)}, ${escapeSql(p.category || [])}, ${escapeSql(p.image)}, 'web', ${escapeSql(p.githubUrl)});`);
  });
}

// 3. Export Skills
const skills = safeRead(path.join(PUBLIC_API, 'skills.json'), []);
if (Array.isArray(skills) && skills.length) {
  output.push('\n-- Insert Skills');
  skills.forEach((s, idx) => {
    output.push(`INSERT INTO skills (name, icon_url, display_order) VALUES (${escapeSql(s.name)}, ${escapeSql(s.img)}, ${idx + 1});`);
  });
}

// 4. Export Blog Posts
const blogPosts = safeRead(path.join(PUBLIC_API, 'blog.json'), []);
if (Array.isArray(blogPosts) && blogPosts.length) {
  output.push('\n-- Insert Blog Posts');
  blogPosts.forEach(b => {
    output.push(`INSERT INTO blog_posts (slug, title, excerpt, content, cover_image, cover_alt, tags, is_published, published_date) VALUES (${escapeSql(b.slug)}, ${escapeSql(b.title)}, ${escapeSql(b.excerpt)}, ${escapeSql(b.content)}, ${escapeSql(b.cover)}, ${escapeSql(b.coverAlt)}, ${escapeSql(b.tags || [])}, ${b.published !== false}, ${escapeSql(b.date)});`);
  });
}

const exportSqlPath = './data/export_data.sql';
fs.writeFileSync(exportSqlPath, output.join('\n'), 'utf8');
console.log(`Successfully generated SQL export script at: ${exportSqlPath}`);
