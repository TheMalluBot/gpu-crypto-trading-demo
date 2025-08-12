// Web Worker for particle calculations
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'CALCULATE_PARTICLES':
      const { width, height, time, particleCount, colors } = data;
      const particles = [];
      
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2 + time * 0.5;
        const radius = 200 + Math.sin(time + i * 0.1) * 50;
        const x = width / 2 + Math.cos(angle) * radius;
        const y = height / 2 + Math.sin(angle) * radius;
        const alpha = 0.3 + Math.sin(time * 2 + i * 0.1) * 0.2;
        
        let colorIndex = i % 3;
        particles.push({
          x,
          y,
          alpha,
          colorIndex
        });
      }
      
      self.postMessage({
        type: 'PARTICLES_CALCULATED',
        particles
      });
      break;
      
    case 'PROCESS_TEXTURE_DATA':
      const { textureData, width: texWidth, height: texHeight } = data;
      // Process texture data if needed
      const processedData = new Uint8ClampedArray(textureData);
      
      self.postMessage({
        type: 'TEXTURE_PROCESSED',
        data: processedData
      });
      break;
  }
};