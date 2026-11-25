import { Scene } from '../types/video';

export interface RenderOptions {
  aspectRatio: '9:16' | '16:9';
  showSubtitles?: boolean;
  showProgressBar?: boolean;
  watermarkText?: string;
}

export class VideoRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: RenderOptions;
  private particles: Array<{
    x: number;
    y: number;
    radius: number;
    speedX: number;
    speedY: number;
    alpha: number;
    color: string;
  }> = [];

  constructor(canvas: HTMLCanvasElement, options: RenderOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context for canvas');
    this.ctx = ctx;
    this.options = options;
    this.updateDimensions();
    this.initParticles();
  }

  public setOptions(options: Partial<RenderOptions>) {
    this.options = { ...this.options, ...options };
    this.updateDimensions();
  }

  private updateDimensions() {
    if (this.options.aspectRatio === '9:16') {
      this.canvas.width = 720;
      this.canvas.height = 1280;
    } else {
      this.canvas.width = 1280;
      this.canvas.height = 720;
    }
  }

  private initParticles() {
    this.particles = [];
    const count = 45;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius: Math.random() * 2.8 + 1,
        speedX: (Math.random() - 0.5) * 0.8,
        speedY: (Math.random() - 0.5) * 0.8,
        alpha: Math.random() * 0.6 + 0.2,
        color: i % 2 === 0 ? '#38bdf8' : '#a855f7',
      });
    }
  }

  /**
   * Render a frame given the current scene, time within scene, and total elapsed timeline
   */
  public renderFrame(
    scene: Scene,
    sceneProgress: number, // 0.0 to 1.0
    sceneIndex: number,
    totalScenes: number,
    globalTimeSec: number
  ) {
    const { width, height } = this.canvas;
    const ctx = this.ctx;
    const isVertical = this.options.aspectRatio === '9:16';

    ctx.clearRect(0, 0, width, height);

    // Calculate scene transition progress (first 0.7s of scene)
    const transitionType = scene.transition || 'fade';
    const transDuration = Math.min(0.7, scene.duration * 0.3);
    const transTime = sceneProgress * scene.duration;
    const transProgress = Math.min(1, transTime / transDuration);
    const transEase = 1 - Math.pow(1 - transProgress, 3); // smooth cubic out

    // Scene Internal Content entrance factor
    const enterProgress = Math.min(1, sceneProgress * 4.5);
    const easeEntrance = 1 - Math.pow(1 - enterProgress, 3);

    ctx.save();

    // Apply Transition Effect Transform
    if (transitionType === 'slide') {
      const dir = sceneIndex % 2 === 0 ? 1 : -1;
      const slideX = (1 - transEase) * width * 0.45 * dir;
      ctx.translate(slideX, 0);
      ctx.globalAlpha = Math.min(1, transEase * 1.4);
    } else if (transitionType === 'zoom') {
      const zoom = 1 + (1 - transEase) * 0.22;
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -height / 2);
      ctx.globalAlpha = Math.min(1, transEase * 1.4);
    } else if (transitionType === 'fade') {
      ctx.globalAlpha = transEase;
    } else {
      // 'none'
      ctx.globalAlpha = 1;
    }

    // 1. Draw Background
    this.drawBackground(scene, globalTimeSec, isVertical);

    // 2. Draw Ambient Animated Particles
    this.drawParticles(globalTimeSec);

    // 3. Draw Category / Scene Badge Pill
    const badgeY = isVertical ? height * 0.14 : height * 0.12;
    this.drawBadge(scene.badge, badgeY, easeEntrance);

    // 4. Draw Headline
    const headlineY = isVertical ? height * 0.22 : height * 0.24;
    this.drawHeadline(scene.heading, headlineY, easeEntrance, isVertical);

    // 5. Draw Subheading / Concept Statement
    const subheadY = isVertical ? height * 0.32 : height * 0.35;
    this.drawSubheading(scene.subheading, subheadY, isVertical);

    // 6. Draw Central Visual Infographic Widget / Graphic Callout
    const centerY = isVertical ? height * 0.54 : height * 0.56;
    this.drawCenterVisual(scene, centerY, globalTimeSec, isVertical);

    // 7. Draw Subtitles / Karaoke Captions (Synced to narration pacing)
    if (this.options.showSubtitles !== false && scene.narration) {
      const captionY = isVertical ? height * 0.82 : height * 0.84;
      this.drawKaraokeSubtitles(scene.narration, sceneProgress, captionY, isVertical);
    }

    // 8. Draw Brand Watermark
    this.drawWatermark(isVertical);

    ctx.restore();

    // 9. Draw Top Story Progress Bar on top (fixed & stable)
    if (this.options.showProgressBar !== false) {
      this.drawTopProgressBar(sceneIndex, totalScenes, sceneProgress);
    }
  }

  private drawBackground(scene: Scene, time: number, isVertical: boolean) {
    const { width, height } = this.canvas;
    const ctx = this.ctx;
    const colors = scene.bgColors || ['#090d16', '#1e1b4b', '#06b6d4'];

    // Radial + Linear Blend
    const shiftX = Math.sin(time * 0.6) * 60;
    const shiftY = Math.cos(time * 0.5) * 60;

    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, colors[0]);
    bgGrad.addColorStop(0.5, colors[1]);
    bgGrad.addColorStop(1, colors[0]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Animated glow orb in background
    const radial = ctx.createRadialGradient(
      width / 2 + shiftX,
      height * (isVertical ? 0.45 : 0.5) + shiftY,
      20,
      width / 2,
      height / 2,
      width * 0.75
    );
    radial.addColorStop(0, hexToRgba(colors[2], 0.28));
    radial.addColorStop(0.6, hexToRgba(colors[1], 0.15));
    radial.addColorStop(1, 'transparent');

    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);

    // Subtle Perspective Grid or Tech lines
    ctx.save();
    ctx.strokeStyle = hexToRgba(colors[2], 0.07);
    ctx.lineWidth = 1;
    const gridSize = isVertical ? 60 : 70;
    const gridOffsetY = (time * 15) % gridSize;

    for (let y = gridOffsetY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawParticles(time: number) {
    const ctx = this.ctx;
    const { width, height } = this.canvas;

    this.particles.forEach((p, idx) => {
      p.x += p.speedX;
      p.y += p.speedY;

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      const alphaPulse = p.alpha + Math.sin(time * 2 + idx) * 0.15;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(p.color, Math.max(0.1, alphaPulse));
      ctx.fill();
    });
  }

  private drawTopProgressBar(currentIndex: number, total: number, sceneProgress: number) {
    const ctx = this.ctx;
    const { width } = this.canvas;
    const padding = 24;
    const gap = 8;
    const totalGaps = (total - 1) * gap;
    const barWidth = (width - padding * 2 - totalGaps) / total;
    const barHeight = 4;
    const topY = 28;

    for (let i = 0; i < total; i++) {
      const x = padding + i * (barWidth + gap);

      // Track background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      roundRect(ctx, x, topY, barWidth, barHeight, 2);
      ctx.fill();

      // Filled portion
      let fillWidth = 0;
      if (i < currentIndex) {
        fillWidth = barWidth;
      } else if (i === currentIndex) {
        fillWidth = barWidth * Math.max(0, Math.min(1, sceneProgress));
      }

      if (fillWidth > 0) {
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, x, topY, fillWidth, barHeight, 2);
        ctx.fill();
      }
    }
  }

  private drawBadge(text: string, y: number, ease: number) {
    if (!text) return;
    const ctx = this.ctx;
    const { width } = this.canvas;

    ctx.save();
    ctx.font = '700 15px system-ui, -apple-system, sans-serif';
    const textWidth = ctx.measureText(text.toUpperCase()).width;
    const padX = 16;
    const badgeW = textWidth + padX * 2;
    const badgeH = 28;
    const x = (width - badgeW) / 2;
    const animY = y + (1 - ease) * 15;

    // Badge Glow
    ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
    ctx.shadowBlur = 12;

    // Badge background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    roundRect(ctx, x, animY, badgeW, badgeH, 14);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Text
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.toUpperCase(), width / 2, animY + badgeH / 2);
    ctx.restore();
  }

  private drawHeadline(text: string, y: number, ease: number, isVertical: boolean) {
    const ctx = this.ctx;
    const { width } = this.canvas;
    const fontSize = isVertical ? 42 : 46;

    ctx.save();
    ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const maxW = width - (isVertical ? 60 : 160);
    const lines = wrapText(ctx, text, maxW);
    const animY = y + (1 - ease) * 20;

    lines.forEach((line, i) => {
      const lineY = animY + i * (fontSize * 1.15);

      // Shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 4;

      // Gradient text
      const textGrad = ctx.createLinearGradient(width / 2 - 200, lineY, width / 2 + 200, lineY + fontSize);
      textGrad.addColorStop(0, '#ffffff');
      textGrad.addColorStop(0.5, '#f8fafc');
      textGrad.addColorStop(1, '#e2e8f0');

      ctx.fillStyle = textGrad;
      ctx.fillText(line, width / 2, lineY);
    });

    ctx.restore();
  }

  private drawSubheading(text: string, y: number, isVertical: boolean) {
    if (!text) return;
    const ctx = this.ctx;
    const { width } = this.canvas;
    const fontSize = isVertical ? 20 : 22;

    ctx.save();
    ctx.font = `500 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const maxW = width - (isVertical ? 80 : 200);
    const lines = wrapText(ctx, text, maxW);

    lines.slice(0, 2).forEach((line, i) => {
      ctx.fillText(line, width / 2, y + i * (fontSize * 1.3));
    });
    ctx.restore();
  }

  private drawCenterVisual(scene: Scene, centerY: number, time: number, isVertical: boolean) {
    const ctx = this.ctx;
    const { width } = this.canvas;

    ctx.save();

    // If scene has metricValue (e.g. 10x, 99%, 2026), draw huge animated metric card
    if (scene.metricValue) {
      const boxW = isVertical ? 340 : 380;
      const boxH = isVertical ? 220 : 180;
      const x = (width - boxW) / 2;
      const y = centerY - boxH / 2;

      // Glow behind card
      const pulseScale = 1 + Math.sin(time * 3) * 0.03;
      ctx.save();
      ctx.translate(width / 2, centerY);
      ctx.scale(pulseScale, pulseScale);
      ctx.translate(-width / 2, -centerY);

      ctx.shadowColor = 'rgba(56, 189, 248, 0.35)';
      ctx.shadowBlur = 30;

      // Glassmorphism card
      const cardGrad = ctx.createLinearGradient(x, y, x + boxW, y + boxH);
      cardGrad.addColorStop(0, 'rgba(30, 41, 59, 0.85)');
      cardGrad.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
      ctx.fillStyle = cardGrad;
      roundRect(ctx, x, y, boxW, boxH, 24);
      ctx.fill();

      // Card border
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Metric value text
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#38bdf8';
      ctx.font = '900 68px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(scene.metricValue, width / 2, centerY - (scene.metricLabel ? 20 : 0));

      // Metric label
      if (scene.metricLabel) {
        ctx.shadowBlur = 0;
        ctx.font = '600 18px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(scene.metricLabel.toUpperCase(), width / 2, centerY + 38);
      }
      ctx.restore();
    } else {
      // Draw dynamic animated concentric tech rings and icon
      const radius = isVertical ? 100 : 85;

      // Ring 1 (Pulse)
      const pulse = Math.sin(time * 2.5) * 8;
      ctx.beginPath();
      ctx.arc(width / 2, centerY, radius + pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Ring 2 (Dashed Orbit)
      ctx.save();
      ctx.translate(width / 2, centerY);
      ctx.rotate(time * 0.8);
      ctx.beginPath();
      ctx.arc(0, 0, radius - 15, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 12]);
      ctx.stroke();
      ctx.restore();

      // Central glowing orb
      const orbGrad = ctx.createRadialGradient(width / 2, centerY, 5, width / 2, centerY, radius - 30);
      orbGrad.addColorStop(0, '#38bdf8');
      orbGrad.addColorStop(0.7, '#6366f1');
      orbGrad.addColorStop(1, 'rgba(15, 23, 42, 0.7)');

      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(width / 2, centerY, radius - 30, 0, Math.PI * 2);
      ctx.fill();

      // Draw vector symbol / star
      this.drawVectorSymbol(width / 2, centerY, scene.visualIcon || 'zap', time);
    }

    ctx.restore();
  }

  private drawVectorSymbol(cx: number, cy: number, iconName: string, time: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const s = 24;

    if (iconName === 'zap' || iconName === 'flame') {
      // Lightning bolt path
      ctx.beginPath();
      ctx.moveTo(cx + 2, cy - s);
      ctx.lineTo(cx - s * 0.6, cy + 2);
      ctx.lineTo(cx + 2, cy + 2);
      ctx.lineTo(cx - 2, cy + s);
      ctx.lineTo(cx + s * 0.7, cy - 2);
      ctx.lineTo(cx + 2, cy - 2);
      ctx.closePath();
      ctx.fill();
    } else if (iconName === 'star' || iconName === 'sparkles') {
      // 4-pointed radiant star
      const spin = time * 0.5;
      ctx.translate(cx, cy);
      ctx.rotate(spin);
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        ctx.lineTo(Math.cos(angle) * s, Math.sin(angle) * s);
        const midAngle = angle + Math.PI / 4;
        ctx.lineTo(Math.cos(midAngle) * (s * 0.35), Math.sin(midAngle) * (s * 0.35));
      }
      ctx.closePath();
      ctx.fill();
    } else {
      // Futuristic atom / gear ring
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Viral YouTube Shorts Subtitle Box with Karaoke-Style Word Highlight
   */
  private drawKaraokeSubtitles(narration: string, progress: number, y: number, isVertical: boolean) {
    const ctx = this.ctx;
    const { width } = this.canvas;
    const words = narration.split(/\s+/).filter(Boolean);
    if (words.length === 0) return;

    // Determine currently active word index based on scene progress
    const activeWordIndex = Math.min(words.length - 1, Math.floor(progress * words.length));

    // Show sliding window of words (e.g. 5-7 words per caption slice)
    const windowSize = isVertical ? 6 : 9;
    const windowStart = Math.floor(activeWordIndex / windowSize) * windowSize;
    const currentWindowWords = words.slice(windowStart, windowStart + windowSize);
    const activeInWindow = activeWordIndex - windowStart;

    ctx.save();
    const fontSize = isVertical ? 26 : 28;
    ctx.font = `800 ${fontSize}px system-ui, -apple-system, sans-serif`;

    // Measure total line width
    let totalW = 0;
    const wordWidths = currentWindowWords.map((w) => {
      const wWidth = ctx.measureText(w + ' ').width;
      totalW += wWidth;
      return wWidth;
    });

    const boxPadX = 24;
    const boxPadY = 14;
    const boxW = Math.min(width - 40, totalW + boxPadX * 2);
    const boxH = fontSize + boxPadY * 2 + 8;
    const boxX = (width - boxW) / 2;

    // Caption container background (dark blurred pill)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 16;
    roundRect(ctx, boxX, y, boxW, boxH, 16);
    ctx.fill();

    // Subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Render words
    let currentX = boxX + (boxW - totalW) / 2;
    const textY = y + boxH / 2;
    ctx.textBaseline = 'middle';

    currentWindowWords.forEach((word, idx) => {
      const isCurrent = idx === activeInWindow;

      if (isCurrent) {
        // Highlight active word in neon yellow/cyan with slight bounce
        ctx.fillStyle = '#fde047'; // Vivid viral yellow
        ctx.shadowColor = 'rgba(253, 224, 71, 0.7)';
        ctx.shadowBlur = 10;
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
      }

      ctx.fillText(word, currentX, textY);
      currentX += wordWidths[idx];
    });

    ctx.restore();
  }

  private drawWatermark(isVertical: boolean) {
    const ctx = this.ctx;
    const { width, height } = this.canvas;

    ctx.save();
    ctx.font = '600 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    const bottomY = height - (isVertical ? 24 : 20);
    const rightX = width - 24;

    const watermark = this.options.watermarkText || 'TubeCraft AI';
    ctx.fillText(watermark, rightX, bottomY);
    ctx.restore();
  }
}

// Helpers
function hexToRgba(hex: string, alpha: number): string {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}
