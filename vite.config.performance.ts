// Phase 2 Week 5 Frontend Performance Agent - Optimized Vite Configuration
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { compression } from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react({
      // Enable React Fast Refresh for development
      fastRefresh: true,
      // Optimize JSX runtime
      jsxRuntime: 'automatic',
      // Babel optimizations
      babel: {
        plugins: [
          // Remove console statements in production
          process.env.NODE_ENV === 'production' && ['babel-plugin-transform-remove-console'],
        ].filter(Boolean),
      },
    }),

    // Bundle analyzer for development
    process.env.ANALYZE &&
      visualizer({
        filename: 'dist/bundle-analysis.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      }),

    // Compression for production
    compression({
      algorithm: 'gzip',
      threshold: 1024,
      deleteOriginFile: false,
    }),

    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false,
    }),
  ],

  // Optimized build configuration
  build: {
    target: 'es2020',
    minify: 'terser',

    // Terser optimization options
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        keep_fargs: false,
        passes: 2,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },

    // Rollup optimization options
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal loading
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom'],

          // Routing
          router: ['react-router-dom'],

          // Charts and visualization
          charts: ['recharts'],

          // Icons
          icons: ['lucide-react'],

          // UI utilities
          'ui-utils': ['framer-motion'],

          // Date and utility libraries
          utils: ['date-fns'],

          // Tauri specific
          tauri: ['@tauri-apps/api'],
        },

        // Optimize chunk file names
        chunkFileNames: chunkInfo => {
          const facadeModuleId = chunkInfo.facadeModuleId;
          if (facadeModuleId) {
            return 'assets/[name]-[hash].js';
          }
          return 'assets/chunk-[hash].js';
        },
      },

      // External dependencies (if using CDN)
      external: [],

      // Tree shaking configuration
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false,
      },
    },

    // Chunk size warning limit
    chunkSizeWarningLimit: 500,

    // Source map configuration
    sourcemap: process.env.NODE_ENV === 'development',

    // Asset optimization
    assetsInlineLimit: 4096, // 4kb

    // CSS code splitting
    cssCodeSplit: true,
  },

  // Development server optimization
  server: {
    host: true,
    port: 1420,
    strictPort: true,
    hmr: {
      overlay: true,
    },
  },

  // Dependency optimization
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tauri-apps/api'],
    exclude: [
      // Exclude large optional dependencies
    ],
    esbuildOptions: {
      target: 'es2020',
    },
  },

  // Path resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },

  // CSS optimization
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`,
      },
    },
    postcss: {
      plugins: [
        require('autoprefixer'),
        require('cssnano')({
          preset: 'default',
        }),
      ],
    },
  },

  // Preview server configuration
  preview: {
    port: 4173,
    strictPort: true,
  },

  // Performance-focused environment variables
  define: {
    __DEV__: process.env.NODE_ENV === 'development',
    __PROD__: process.env.NODE_ENV === 'production',
    __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },

  // Worker optimization
  worker: {
    format: 'es',
    plugins: [
      // Optimize web workers
    ],
  },
});
