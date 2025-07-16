import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

const ParticleCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTextureHash = useRef<string | null>(null);
  const imageDataRef = useRef<ImageData | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with debouncing
    const resizeCanvas = useCallback(() => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    }, [canvas]);

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation loop
    const animate = useCallback(async () => {
      try {
        // Get texture data from GPU renderer
        const textureData = await invoke('get_texture_data') as number[];
        
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
        
        // Clear canvas with dark background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.1)';
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
    }, []);

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // Cleanup refs
      lastTextureHash.current = null;
      imageDataRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ filter: 'blur(0.5px)' }}
    />
  );
};

export default ParticleCanvas;