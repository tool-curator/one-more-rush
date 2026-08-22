import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = (process.env.VITE_SITE_URL || env.VITE_SITE_URL || '').replace(/\/+$/, '');

  return {
    base: './',
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              if (id.includes('canvas-confetti')) {
                return 'vendor-confetti';
              }
              if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
                return 'vendor-react';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-lucide';
              }
              return 'vendor-misc';
            }
          },
        },
      },
    },
    plugins: [
      react(),
      {
        name: 'seo-post-build-generator',
        closeBundle() {
          const distDir = path.resolve(process.cwd(), 'dist');
          if (!fs.existsSync(distDir)) return;

          if (!siteUrl) {
            console.warn('\n⚠️ [SEO Build Notice] VITE_SITE_URL is not configured. For production, set VITE_SITE_URL=https://onemorerush.com\n');
          }

          // 1. Process sitemap.xml
          const sitemapPath = path.join(distDir, 'sitemap.xml');
          if (fs.existsSync(sitemapPath) && siteUrl) {
            let sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
            sitemapContent = sitemapContent
              .replace(/<loc>\/<\/loc>/g, `<loc>${siteUrl}/</loc>`)
              .replace(/<loc>\/([^<]+)<\/loc>/g, `<loc>${siteUrl}/$1</loc>`);
            fs.writeFileSync(sitemapPath, sitemapContent, 'utf-8');
          }

          // 2. Process robots.txt
          const robotsPath = path.join(distDir, 'robots.txt');
          if (fs.existsSync(robotsPath) && siteUrl) {
            let robotsContent = fs.readFileSync(robotsPath, 'utf-8');
            robotsContent = robotsContent.replace(/Sitemap:\s*\/sitemap\.xml/g, `Sitemap: ${siteUrl}/sitemap.xml`);
            fs.writeFileSync(robotsPath, robotsContent, 'utf-8');
          }

          // 3. Process index.html for static SEO tags
          const htmlPath = path.join(distDir, 'index.html');
          if (fs.existsSync(htmlPath) && siteUrl) {
            let htmlContent = fs.readFileSync(htmlPath, 'utf-8');
            htmlContent = htmlContent
              .replace(/"url":\s*"[^"]*"/g, `"url": "${siteUrl}/"`)
              .replace(/content="\/og-image\.png"/g, `content="${siteUrl}/og-image.png"`);
            fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
          }
        },
      },
    ],
  };
});
