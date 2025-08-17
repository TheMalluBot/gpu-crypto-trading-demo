import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Optimized Vite configuration for better build performance
export default defineConfig({
  plugins: [
    react({
      // Use SWC for faster builds
      fastRefresh: true,
      // Babel configuration for production optimizations
      babel: {
        plugins: [
          ['@babel/plugin-transform-react-remove-prop-types', { removeImport: true }],
        ],
      },
    }),
  ],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },

  build: {
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
          'chart-vendor': ['recharts'],
          'tauri-vendor': ['@tauri-apps/api'],
        },
        // Optimize asset naming
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: ({ name }) => {
          if (/\.(gif|jpe?g|png|svg)$/.test(name ?? '')) {
            return 'images/[name]-[hash][extname]';
          }
          if (/\.css$/.test(name ?? '')) {
            return 'css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    
    // Enable source maps for production debugging
    sourcemap: process.env.NODE_ENV === 'development' ? 'inline' : false,
    
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
      format: {
        comments: false,
      },
    },
    
    // Enable CSS code splitting
    cssCodeSplit: true,
    
    // Asset inlining threshold
    assetsInlineLimit: 4096,
    
    // Target modern browsers for smaller bundles
    target: 'es2020',
  },

  optimizeDeps: {
    // Pre-bundle heavy dependencies
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'recharts',
      '@tauri-apps/api',
    ],
    // Exclude dependencies that should not be pre-bundled
    exclude: ['@tauri-apps/api'],
    // Force dependency optimization
    force: process.env.NODE_ENV === 'development',
  },

  server: {
    port: 3000,
    strictPort: false,
    host: true,
    // HMR configuration
    hmr: {
      overlay: true,
      protocol: 'ws',
      host: 'localhost',
    },
    // Proxy configuration for API calls
    proxy: {
      '/api': {
        target: 'https://testnet.binance.vision',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
    // Watch options
    watch: {
      usePolling: false,
      interval: 100,
    },
  },

  preview: {
    port: 4173,
    strictPort: false,
    host: true,
  },

  // CSS configuration
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCase',
    },
    postcss: {
      plugins: [],
    },
  },

  // Environment variable configuration
  envPrefix: ['VITE_', 'TAURI_'],
  
  // Performance optimizations
  esbuild: {
    // Faster JSX transform
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    // Drop console and debugger in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    // Target modern JavaScript
    target: 'es2020',
    // Enable tree-shaking
    treeShaking: true,
  },

  // Clear screen on dev server start
  clearScreen: false,
  
  // Log level
  logLevel: 'info',
});