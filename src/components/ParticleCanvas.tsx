import React, { useEffect, useRef, useCallback } from 'react';
import { safeInvoke, isTauriApp } from '../utils/tauri';
import { useTheme } from '../contexts/ThemeContext';

const ParticleCanvas: React.FC = React.memo(() => {
  const { currentTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTextureHash = useRef<string | null>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const particlesRef = useRef<any[]>([]);

  // Initialize Web Worker
  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      workerRef.current = new Worker('/particle-worker.js');
      workerRef.current.onmessage = e => {
        const { type, particles } = e.data;
        if (type === 'PARTICLES_CALCULATED') {
          particlesRef.current = particles;
        }
      };
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Define resize function outside useEffect
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }, []);

  // Define animate function outside useEffect
  const animate = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      // Check if we're in Tauri environment
      if (isTauriApp()) {
        // Get texture data from GPU renderer
        const textureData = await safeInvoke<number[]>('get_texture_data');

        if (!textureData) {
          throw new Error('No texture data available');
        }

        // Create hash to check if texture changed
        const textureHash = textureData.slice(0, 100).join(',');

        // Only update texture if it changed
        if (textureHash !== lastTextureHash.current) {
          lastTextureHash.current = textureHash;

          // Reuse ImageData if possible
          if (!imageDataRef.current) {
            imageDataRef.current = ctx.createImageData(512, 512);
          }

          const imageData = imageDataRef.current;
          const data = imageData.data;

          for (let i = 0; i < textureData.length; i++) {
            data[i] = textureData[i];
          }

          // Reuse temp canvas
          if (!tempCanvasRef.current) {
            tempCanvasRef.current = document.createElement('canvas');
            tempCanvasRef.current.width = 512;
            tempCanvasRef.current.height = 512;
          }

          const tempCtx = tempCanvasRef.current.getContext('2d');
          if (tempCtx) {
            tempCtx.putImageData(imageData, 0, 0);
          }
        }

        // Clear canvas with theme-aware background
        const bgColor = currentTheme.colors.background.primary;
        ctx.fillStyle = `rgba(${bgColor}, 0.1)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw cached texture
        if (tempCanvasRef.current) {
          const scale = Math.min(canvas.width / 512, canvas.height / 512);
          const scaledWidth = 512 * scale;
          const scaledHeight = 512 * scale;
          const x = (canvas.width - scaledWidth) / 2;
          const y = (canvas.height - scaledHeight) / 2;

          ctx.drawImage(tempCanvasRef.current, x, y, scaledWidth, scaledHeight);
        }
      } else {
        // Fallback animation for browser development with theme colors
        const bgColor = currentTheme.colors.background.primary;
        ctx.fillStyle = `rgba(${bgColor}, 0.05)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Use Web Worker for particle calculations if available
        const time = Date.now() * 0.001;
        const colors = [
          currentTheme.colors.primary[500],
          currentTheme.colors.secondary[500],
          currentTheme.colors.accent[500],
        ];

        if (workerRef.current) {
          // Send calculation to Web Worker
          workerRef.current.postMessage({
            type: 'CALCULATE_PARTICLES',
            data: {
              width: canvas.width,
              height: canvas.height,
              time,
              particleCount: 100,
              colors,
            },
          });

          // Draw particles calculated by worker
          particlesRef.current.forEach(particle => {
            const color = colors[particle.colorIndex];
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color}, ${particle.alpha})`;
            ctx.fill();
          });
        } else {
          // Fallback to main thread calculation
          for (let i = 0; i < 100; i++) {
            const angle = (i / 100) * Math.PI * 2 + time * 0.5;
            const radius = 200 + Math.sin(time + i * 0.1) * 50;
            const x = canvas.width / 2 + Math.cos(angle) * radius;
            const y = canvas.height / 2 + Math.sin(angle) * radius;
            const alpha = 0.3 + Math.sin(time * 2 + i * 0.1) * 0.2;
            const color = colors[i % 3];

            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color}, ${alpha})`;
            ctx.fill();
          }
        }
      }
    } catch (error) {
      // Fallback animation if GPU texture unavailable
      ctx.fillStyle = 'rgba(15, 23, 42, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw simple animated particles
      const time = Date.now() * 0.001;

      for (let i = 0; i < 100; i++) {
        const angle = (i / 100) * Math.PI * 2 + time * 0.5;
        const radius = 200 + Math.sin(time + i * 0.1) * 50;
        const x = canvas.width / 2 + Math.cos(angle) * radius;
        const y = canvas.height / 2 + Math.sin(angle) * radius;

        const hue = (i / 100) * 360 + time * 50;
        const alpha = 0.3 + Math.sin(time * 2 + i * 0.1) * 0.2;

        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${alpha})`;
        ctx.fill();
      }
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [currentTheme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Start animation loop
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
      // Cleanup refs to prevent memory leaks
      lastTextureHash.current = null;
      imageDataRef.current = null;
      if (tempCanvasRef.current) {
        tempCanvasRef.current = null;
      }
    };
  }, [resizeCanvas, animate]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none particle-canvas-blur"
    />
  );
});

export default ParticleCanvas;
