import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    // Custom plugin to handle hash routing properly
    {
      name: 'hash-routing-404',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Allow static assets and root path
          if (req.url?.startsWith('/assets/') || 
              req.url?.startsWith('/@vite/') || 
              req.url?.startsWith('/node_modules/') ||
              req.url === '/favicon.ico' ||
              req.url === '/') {
            return next();
          }
          
          // Block specific application paths that should use hash routing
          const blockedPaths = [
            '/contacts', '/leads', '/deals', '/tasks', '/subsidiaries', '/dealers',
            '/notifications', '/profile', '/team-chat', '/login', '/signup', '/logout',
            '/settings', '/reports', '/analytics', '/integrations'
          ];
          
          const isBlockedPath = blockedPaths.some(path => 
            req.url?.startsWith(path) || req.url === path
          );
          
          if (isBlockedPath) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/html');
            
            // Serve custom 404 page
            try {
              const notFoundHtml = readFileSync(
                resolve(__dirname, 'public/404.html'),
                'utf-8'
              );
              res.end(notFoundHtml);
            } catch (e) {
              // Fallback if 404.html doesn't exist
              res.end(`
                <!DOCTYPE html>
                <html>
                <head><title>404 - Page Not Found</title></head>
                <body>
                  <h1>404 - Page Not Found</h1>
                  <p>The page you're looking for doesn't exist.</p>
                  <p><a href="/#/">Go back to home</a></p>
                </body>
                </html>
              `);
            }
            return;
          }
          
          next();
        });
      }
    }
  ],
  server: {
    host: true,
    port: 5174,
    // Custom middleware handles routing - no historyApiFallback needed
  },
  build: {
    // Ensure proper asset handling for static hosting
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Better caching for static assets
        assetFileNames: 'assets/[name].[hash][extname]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js'
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
