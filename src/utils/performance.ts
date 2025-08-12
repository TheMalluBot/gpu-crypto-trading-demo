// Phase 2 Week 5 Frontend Performance Agent - Performance Utilities
import { useCallback, useRef, useEffect, useMemo } from 'react';

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private observer?: PerformanceObserver;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  constructor() {
    this.initializeObserver();
  }

  private initializeObserver() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.observer = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.recordMetric(entry.name, entry.duration || entry.startTime);
        });
      });

      this.observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
    }
  }

  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    const values = this.metrics.get(name)!;
    values.push(value);

    // Keep only last 100 measurements to prevent memory issues
    if (values.length > 100) {
      values.shift();
    }
  }

  getMetrics(name: string): { avg: number; min: number; max: number; count: number } {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }

    const sum = values.reduce((a, b) => a + b, 0);
    return {
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }

  clearMetrics(name?: string) {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  // Web Vitals measurement
  measureWebVitals() {
    if (typeof window === 'undefined') return;

    // First Contentful Paint
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    if (fcp) {
      this.recordMetric('FCP', fcp.startTime);
    }

    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('LCP', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    }

    // Cumulative Layout Shift
    let clsValue = 0;
    if ('PerformanceObserver' in window) {
      const clsObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.recordMetric('CLS', clsValue);
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }
  }

  // Performance timing for React components
  startTiming(name: string): () => void {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      this.recordMetric(name, endTime - startTime);
    };
  }
}

// React hooks for performance optimization

// Debounced callback hook
export function useDebounce<T extends (...args: any[]) => any>(callback: T, delay: number): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

// Throttled callback hook
export function useThrottle<T extends (...args: any[]) => any>(callback: T, delay: number): T {
  const lastCallRef = useRef<number>(0);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        return callback(...args);
      }
    }) as T,
    [callback, delay]
  );
}

// Memoized heavy computation hook
export function useHeavyComputation<T>(computation: () => T, dependencies: any[]): T {
  const monitor = PerformanceMonitor.getInstance();

  return useMemo(() => {
    const endTiming = monitor.startTiming('heavy-computation');
    const result = computation();
    endTiming();
    return result;
  }, dependencies);
}

// Intersection observer hook for lazy loading
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!ref.current || !('IntersectionObserver' in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      options
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref, options]);

  return isIntersecting;
}

// Virtual scrolling hook
export function useVirtualScrolling(
  itemCount: number,
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(start + Math.ceil(containerHeight / itemHeight), itemCount - 1);
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, itemCount]);

  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return { visibleRange, onScroll, totalHeight: itemCount * itemHeight };
}

// Memory usage monitoring
export function useMemoryMonitor(): {
  usedJSMemory: number;
  totalJSMemory: number;
  jsMemoryLimit: number;
} {
  const [memoryInfo, setMemoryInfo] = useState({
    usedJSMemory: 0,
    totalJSMemory: 0,
    jsMemoryLimit: 0,
  });

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryInfo({
          usedJSMemory: memory.usedJSHeapSize,
          totalJSMemory: memory.totalJSHeapSize,
          jsMemoryLimit: memory.jsHeapSizeLimit,
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
}

// Bundle size utilities
export const bundleUtils = {
  // Dynamic import with error handling
  loadModule: async <T>(moduleLoader: () => Promise<T>): Promise<T | null> => {
    try {
      const module = await moduleLoader();
      return module;
    } catch (error) {
      console.error('Failed to load module:', error);
      return null;
    }
  },

  // Preload critical modules
  preloadModule: (moduleLoader: () => Promise<any>) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        moduleLoader().catch(() => {
          // Ignore preload errors
        });
      });
    } else {
      setTimeout(() => {
        moduleLoader().catch(() => {
          // Ignore preload errors
        });
      }, 100);
    }
  },
};

// Image optimization utilities
export const imageUtils = {
  // Create optimized image loading
  createOptimizedImage: (
    src: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'webp' | 'avif' | 'jpeg' | 'png';
      loading?: 'lazy' | 'eager';
    } = {}
  ): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();

      if (options.loading === 'lazy') {
        img.loading = 'lazy';
      }

      img.onload = () => resolve(img);
      img.onerror = reject;

      // Add responsive image support if width/height provided
      if (options.width || options.height) {
        const params = new URLSearchParams();
        if (options.width) params.set('w', options.width.toString());
        if (options.height) params.set('h', options.height.toString());
        if (options.quality) params.set('q', options.quality.toString());
        if (options.format) params.set('f', options.format);

        img.src = `${src}?${params.toString()}`;
      } else {
        img.src = src;
      }
    });
  },

  // Lazy load images with intersection observer
  lazyLoadImage: (
    element: HTMLImageElement,
    src: string,
    options: IntersectionObserverInit = {}
  ) => {
    if (!('IntersectionObserver' in window)) {
      element.src = src;
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          element.src = src;
          observer.unobserve(element);
        }
      });
    }, options);

    observer.observe(element);
  },
};

// Font loading optimization
export const fontUtils = {
  // Preload critical fonts
  preloadFont: (fontFamily: string, fontWeight = '400', fontDisplay = 'swap') => {
    if (typeof document === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    link.href = `/fonts/${fontFamily}-${fontWeight}.woff2`;

    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: '${fontFamily}';
        font-weight: ${fontWeight};
        font-display: ${fontDisplay};
        src: url('/fonts/${fontFamily}-${fontWeight}.woff2') format('woff2');
      }
    `;

    document.head.appendChild(link);
    document.head.appendChild(style);
  },
};

// Export performance monitor instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Initialize Web Vitals monitoring
if (typeof window !== 'undefined') {
  performanceMonitor.measureWebVitals();
}
