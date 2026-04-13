import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr/node';
import express from 'express';
import compression from 'compression';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';

// Cache-Control values
const SSR_CACHE_CONTROL = 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400';
const STATIC_IMMUTABLE  = 'public, max-age=31536000, immutable';

export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  // Enable gzip/deflate compression for all responses
  server.use(compression());

  // Strip trailing slashes with a 301 redirect (e.g. /blog/ → /blog)
  server.use((req, res, next) => {
    if (req.path !== '/' && req.path.endsWith('/')) {
      const cleanPath = req.path.slice(0, -1);
      const query = req.url.slice(req.path.length);
      res.redirect(301, cleanPath + query);
    } else {
      next();
    }
  });

  // Permanent redirect: /sip-calculator → / (canonical URL)
  server.get('/sip-calculator', (_req, res) => {
    res.redirect(301, '/');
  });

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // Security + performance headers applied to all responses
  server.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('X-DNS-Prefetch-Control', 'on');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Serve static files from /browser with immutable cache (hashed filenames)
  server.get(
    '**',
    express.static(browserDistFolder, {
      maxAge: '1y',
      immutable: true,
      index: 'index.html',
      setHeaders: (res, filePath) => {
        // Hashed assets get immutable cache; HTML files get short cache
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'public, max-age=600');
        } else {
          res.setHeader('Cache-Control', STATIC_IMMUTABLE);
        }
      },
    })
  );

  // All regular routes use the Angular engine
  server.get('**', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html) => {
        res.setHeader('Cache-Control', SSR_CACHE_CONTROL);
        res.setHeader('Vary', 'Accept-Encoding');
        res.send(html);
      })
      .catch((err) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();
