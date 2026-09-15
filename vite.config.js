import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { mockApiHandler } from "./vite-plugin-mock-api.js";
import fs from "node:fs";
import path from "node:path";

function mockApiPlugin() {
  return {
    name: "mock-api",
    configureServer(server) {
      server.middlewares.use(mockApiHandler);
    },
  };
}

/* On Vercel (no PHP runtime) the copied public/ PHP sources would be served
   as raw text — a source/password leak. Strip them from the build output
   there only; local dist keeps PHP for the self-hosted htdocs sync. */
function stripServerSources() {
  return {
    name: "strip-server-sources",
    closeBundle() {
      const out = path.resolve(__dirname, "dist");
      const kill = [];
      const walk = (dir) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, e.name);
          if (e.isDirectory()) walk(p);
          else if (/\.(php|phtml|sql|bak|ini|env|log)$/i.test(e.name) || e.name === ".htaccess")
            kill.push(p);
        }
      };
      if (!fs.existsSync(out)) return;
      walk(out);
      for (const p of kill) {
        try { fs.rmSync(p); } catch { /* best-effort cleanup */ }
      }
      console.log(`[strip-server-sources] removed ${kill.length} server-side files from dist`);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  plugins: [
    react(),
    tailwindcss(),
    mockApiPlugin(),
    ...(process.env.VERCEL ? [stripServerSources()] : []),
  ],
});
