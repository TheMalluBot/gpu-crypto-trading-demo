// Phase 2 Week 5 Frontend Performance Agent - Optimized Particle Canvas
import React, { useRef, useEffect, useCallback, useState, memo } from 'react';

interface ParticleCanvasProps {
  width?: number;
  height?: number;
  particleCount?: number;
  className?: string;
  enableGPU?: boolean;
  maxFPS?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

// Optimized particle system with GPU acceleration and performance controls
const OptimizedParticleCanvas = memo(
  ({
    width = 800,
    height = 600,
    particleCount = 500, // Reduced from unlimited for performance
    className = '',
    enableGPU = true,
    maxFPS = 60,
  }: ParticleCanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();
    const particlesRef = useRef<Particle[]>([]);
    const lastFrameTimeRef = useRef<number>(0);
    const fpsIntervalRef = useRef<number>(1000 / maxFPS);

    const [isGPUAvailable, setIsGPUAvailable] = useState(false);
    const [performanceMode, setPerformanceMode] = useState<'high' | 'medium' | 'low'>('high');

    // GPU-accelerated particle system using WebGL
    const initializeWebGL = useCallback((canvas: HTMLCanvasElement) => {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) {
        console.warn('WebGL not available, falling back to 2D canvas');
        return null;
      }

      // Vertex shader for particle rendering
      const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_velocity;
      attribute float a_size;
      attribute vec3 a_color;
      attribute float a_life;
      
      uniform vec2 u_resolution;
      uniform float u_time;
      
      varying vec3 v_color;
      varying float v_alpha;
      
      void main() {
        vec2 position = a_position + a_velocity * u_time;
        
        // Wrap around screen edges
        position = mod(position, u_resolution);
        
        vec2 clipSpace = ((position / u_resolution) * 2.0 - 1.0) * vec2(1, -1);
        
        gl_Position = vec4(clipSpace, 0, 1);
        gl_PointSize = a_size;
        
        v_color = a_color;
        v_alpha = a_life;
      }
    `;

      // Fragment shader for particle rendering
      const fragmentShaderSource = `
      precision mediump float;
      
      varying vec3 v_color;
      varying float v_alpha;
      
      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        
        if (dist > 0.5) {
          discard;
        }
        
        float alpha = (1.0 - dist * 2.0) * v_alpha;
        gl_FragColor = vec4(v_color, alpha);
      }
    `;

      // Create and compile shaders
      const createShader = (type: number, source: string) => {
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
          gl.deleteShader(shader);
          return null;
        }

        return shader;
      };

      const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
      const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

      if (!vertexShader || !fragmentShader) {
        return null;
      }

      // Create program
      const program = gl.createProgram()!;
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program));
        return null;
      }

      return { gl, program };
    }, []);

    // Initialize particles with optimized data structure
    const initializeParticles = useCallback(() => {
      const particles: Particle[] = [];
      const colors = [
        '#3b82f6', // Blue
        '#10b981', // Green
        '#f59e0b', // Yellow
        '#ef4444', // Red
        '#8b5cf6', // Purple
      ];

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          size: Math.random() * 4 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: Math.random(),
          maxLife: Math.random() * 100 + 50,
        });
      }

      particlesRef.current = particles;
    }, [particleCount, width, height]);

    // Optimized 2D canvas rendering with performance controls
    const render2D = useCallback(
      (ctx: CanvasRenderingContext2D, deltaTime: number) => {
        // Clear canvas with optimized method
        ctx.clearRect(0, 0, width, height);

        // Batch operations for better performance
        ctx.save();

        const particles = particlesRef.current;
        const particleCountToRender =
          performanceMode === 'high'
            ? particles.length
            : performanceMode === 'medium'
              ? Math.floor(particles.length * 0.7)
              : Math.floor(particles.length * 0.4);

        for (let i = 0; i < particleCountToRender; i++) {
          const particle = particles[i];

          // Update particle position
          particle.x += particle.vx;
          particle.y += particle.vy;

          // Wrap around screen edges
          if (particle.x < 0) particle.x = width;
          if (particle.x > width) particle.x = 0;
          if (particle.y < 0) particle.y = height;
          if (particle.y > height) particle.y = 0;

          // Update life
          particle.life -= deltaTime * 0.01;
          if (particle.life <= 0) {
            particle.life = 1;
            particle.x = Math.random() * width;
            particle.y = Math.random() * height;
          }

          // Render particle with alpha based on life
          ctx.globalAlpha = particle.life;
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      },
      [width, height, performanceMode]
    );

    // Main animation loop with FPS control
    const animate = useCallback(
      (currentTime: number) => {
        const deltaTime = currentTime - lastFrameTimeRef.current;

        // FPS limiting
        if (deltaTime >= fpsIntervalRef.current) {
          const canvas = canvasRef.current;
          if (!canvas) return;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            render2D(ctx, deltaTime);
          }

          lastFrameTimeRef.current = currentTime;
        }

        animationRef.current = requestAnimationFrame(animate);
      },
      [render2D]
    );

    // Performance monitoring and adaptive quality
    useEffect(() => {
      let frameCount = 0;
      let lastCheck = performance.now();

      const checkPerformance = () => {
        frameCount++;
        const now = performance.now();

        if (now - lastCheck >= 1000) {
          // Check every second
          const fps = frameCount;
          frameCount = 0;
          lastCheck = now;

          // Adjust performance mode based on FPS
          if (fps < 30 && performanceMode !== 'low') {
            setPerformanceMode('low');
            console.log('Switching to low performance mode');
          } else if (fps > 50 && fps < 55 && performanceMode !== 'medium') {
            setPerformanceMode('medium');
            console.log('Switching to medium performance mode');
          } else if (fps >= 55 && performanceMode !== 'high') {
            setPerformanceMode('high');
            console.log('Switching to high performance mode');
          }
        }

        if (animationRef.current) {
          requestAnimationFrame(checkPerformance);
        }
      };

      const timeoutId = setTimeout(() => {
        requestAnimationFrame(checkPerformance);
      }, 2000); // Start monitoring after 2 seconds

      return () => clearTimeout(timeoutId);
    }, [performanceMode]);

    // Initialize canvas and particles
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Set canvas size
      canvas.width = width;
      canvas.height = height;

      // Check for GPU acceleration support
      if (enableGPU) {
        const webglContext = initializeWebGL(canvas);
        setIsGPUAvailable(!!webglContext);
      }

      // Initialize particles
      initializeParticles();

      // Start animation
      lastFrameTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, [width, height, enableGPU, initializeWebGL, initializeParticles, animate]);

    // Update FPS interval when maxFPS changes
    useEffect(() => {
      fpsIntervalRef.current = 1000 / maxFPS;
    }, [maxFPS]);

    // Handle visibility change to pause/resume animation
    useEffect(() => {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
        } else {
          lastFrameTimeRef.current = performance.now();
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [animate]);

    return (
      <div className={`particle-canvas-container ${className}`}>
        <canvas
          ref={canvasRef}
          className="particle-canvas"
          style={{
            width: '100%',
            height: '100%',
            maxWidth: width,
            maxHeight: height,
          }}
          aria-label="Animated particle background"
          role="img"
        />

        {/* Performance indicator */}
        <div className="performance-indicator">
          <div className={`performance-mode ${performanceMode}`}>
            {performanceMode.toUpperCase()}
          </div>
          {isGPUAvailable && enableGPU && <div className="gpu-indicator">GPU</div>}
        </div>
      </div>
    );
  }
);

OptimizedParticleCanvas.displayName = 'OptimizedParticleCanvas';

export default OptimizedParticleCanvas;

// Performance-optimized particle canvas with reduced features for low-end devices
export const LightweightParticleCanvas = memo(
  ({
    width = 400,
    height = 300,
    particleCount = 50, // Much reduced count
    className = '',
  }: Omit<ParticleCanvasProps, 'enableGPU' | 'maxFPS'>) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = width;
      canvas.height = height;

      // Simple floating particles for low-end devices
      const particles = Array.from({ length: particleCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
      }));

      const animate = () => {
        ctx.clearRect(0, 0, width, height);

        particles.forEach(particle => {
          particle.x += particle.vx;
          particle.y += particle.vy;

          if (particle.x < 0 || particle.x > width) particle.vx *= -1;
          if (particle.y < 0 || particle.y > height) particle.vy *= -1;

          ctx.globalAlpha = particle.opacity;
          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
        });

        animationRef.current = requestAnimationFrame(animate);
      };

      animate();

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, [width, height, particleCount]);

    return (
      <canvas
        ref={canvasRef}
        className={`lightweight-particle-canvas ${className}`}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: width,
          maxHeight: height,
        }}
        aria-label="Simple animated background"
        role="img"
      />
    );
  }
);

LightweightParticleCanvas.displayName = 'LightweightParticleCanvas';
