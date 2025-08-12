import React, { useRef, useEffect, useCallback, useState } from 'react';
import { ChartDataPoint } from '../../types/bot';

interface GpuAcceleratedChartProps {
  data: ChartDataPoint[];
  width?: number;
  height?: number;
  showGrid?: boolean;
  lineColor?: string;
  backgroundColor?: string;
}

export const GpuAcceleratedChart: React.FC<GpuAcceleratedChartProps> = ({
  data,
  width = 800,
  height = 400,
  showGrid = true,
  lineColor = '#3b82f6',
  backgroundColor = 'rgba(0,0,0,0.1)',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const animationRef = useRef<number>();
  const [fallbackMode, setFallbackMode] = useState(false);

  const vertexShaderSource = `
    attribute vec2 a_position;
    uniform vec2 u_resolution;
    uniform vec2 u_translation;
    uniform vec2 u_scale;
    
    void main() {
      vec2 scaledPosition = a_position * u_scale + u_translation;
      vec2 clipSpace = ((scaledPosition / u_resolution) * 2.0 - 1.0) * vec2(1, -1);
      gl_Position = vec4(clipSpace, 0, 1);
    }
  `;

  const fragmentShaderSource = `
    precision mediump float;
    uniform vec4 u_color;
    
    void main() {
      gl_FragColor = u_color;
    }
  `;

  const initWebGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.warn('WebGL not supported, falling back to 2D canvas');
      setFallbackMode(true);
      return false;
    }

    glRef.current = gl as WebGLRenderingContext;

    const vertexShader = createShader(
      gl as WebGLRenderingContext,
      (gl as WebGLRenderingContext).VERTEX_SHADER,
      vertexShaderSource
    );
    const fragmentShader = createShader(
      gl as WebGLRenderingContext,
      (gl as WebGLRenderingContext).FRAGMENT_SHADER,
      fragmentShaderSource
    );

    if (!vertexShader || !fragmentShader) {
      setFallbackMode(true);
      return false;
    }

    const program = gl.createProgram();
    if (!program) {
      setFallbackMode(true);
      return false;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking failed:', gl.getProgramInfoLog(program));
      setFallbackMode(true);
      return false;
    }

    programRef.current = program;
    return true;
  }, [vertexShaderSource, fragmentShaderSource]);

  const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  };

  const renderWebGL = useCallback(() => {
    const gl = glRef.current;
    const program = programRef.current;
    if (!gl || !program || data.length === 0) return;

    gl.viewport(0, 0, width, height);
    const bgAlpha = backgroundColor.includes('0.1') ? 0.1 : 0.1;
    gl.clearColor(0, 0, 0, bgAlpha);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    const positions = [];
    const minValue = Math.min(...data.map(d => d.lro_value));
    const maxValue = Math.max(...data.map(d => d.lro_value));
    const valueRange = maxValue - minValue || 1;

    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * width;
      const y = ((data[i].lro_value - minValue) / valueRange) * height;
      positions.push(x, y);
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const colorLocation = gl.getUniformLocation(program, 'u_color');
    const translationLocation = gl.getUniformLocation(program, 'u_translation');
    const scaleLocation = gl.getUniformLocation(program, 'u_scale');

    gl.uniform2f(resolutionLocation, width, height);
    gl.uniform4f(colorLocation, 0.23, 0.51, 0.96, 1.0);
    gl.uniform2f(translationLocation, 0, 0);
    gl.uniform2f(scaleLocation, 1, 1);

    gl.drawArrays(gl.LINE_STRIP, 0, positions.length / 2);

    if (showGrid) {
      drawGrid(gl, program, width, height);
    }
  }, [data, width, height, showGrid]);

  const drawGrid = (gl: WebGLRenderingContext, program: WebGLProgram, w: number, h: number) => {
    const gridLines = [];
    const gridSpacing = 50;

    for (let x = 0; x <= w; x += gridSpacing) {
      gridLines.push(x, 0, x, h);
    }

    for (let y = 0; y <= h; y += gridSpacing) {
      gridLines.push(0, y, w, y);
    }

    const gridBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gridLines), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const colorLocation = gl.getUniformLocation(program, 'u_color');
    gl.uniform4f(colorLocation, 0.3, 0.3, 0.3, 0.5);

    gl.drawArrays(gl.LINES, 0, gridLines.length / 2);
  };

  const render2DFallback = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const minValue = Math.min(...data.map(d => d.lro_value));
    const maxValue = Math.max(...data.map(d => d.lro_value));
    const valueRange = maxValue - minValue || 1;

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((data[i].lro_value - minValue) / valueRange) * height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      const gridSpacing = 50;

      for (let x = 0; x <= width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      for (let y = 0; y <= height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }
  }, [data, width, height, showGrid, lineColor]);

  const animate = useCallback(() => {
    if (fallbackMode) {
      render2DFallback();
    } else {
      renderWebGL();
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [fallbackMode, render2DFallback, renderWebGL]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;

    if (!fallbackMode && initWebGL()) {
      animate();
    } else {
      setFallbackMode(true);
      animate();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height, fallbackMode, initWebGL, animate]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="gpu-accelerated-chart w-full h-full"
        style={{ width: '100%', height: '100%' }}
        aria-label="GPU-accelerated trading chart"
      />
      {!fallbackMode && (
        <div className="absolute top-2 right-2 flex items-center space-x-1 text-xs text-green-400">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>WebGL</span>
        </div>
      )}
    </div>
  );
};
