// High-resolution canvas-based stamp generator that returns a true PNG data URL
export function generateOfficialStampDataUrl(): string {
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  const width = 460;
  const height = 240;
  canvas.width = width * 2; // 2x DPI for crisp rendering
  canvas.height = height * 2;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(2, 2);

  // Slight natural stamp tilt (-2.2 degrees)
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((-2.2 * Math.PI) / 180);
  ctx.translate(-width / 2, -height / 2);

  const primaryBlue = '#1e3a8a';
  const accentBlue = '#2563eb';
  const inkDark = '#0f172a';

  // 1. Outer Rounded Rectangle Border
  ctx.strokeStyle = primaryBlue;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(14, 14, 432, 212, 14);
  } else {
    ctx.rect(14, 14, 432, 212);
  }
  ctx.fillStyle = 'rgba(248, 250, 255, 0.9)';
  ctx.fill();
  ctx.stroke();

  // 2. Inner Dashed Rounded Rectangle
  ctx.strokeStyle = primaryBlue;
  ctx.lineWidth = 1.4;
  ctx.setLineDash([7, 4]);
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(22, 22, 416, 196, 9);
  } else {
    ctx.rect(22, 22, 416, 196);
  }
  ctx.stroke();
  ctx.setLineDash([]); // Reset line dash

  // 3. Top Header: TISHA LED WALLS
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = primaryBlue;
  ctx.letterSpacing = '2.5px';
  ctx.fillText('TISHA LED WALLS', 230, 52);

  // 4. Sub-location
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = accentBlue;
  ctx.letterSpacing = '1.2px';
  ctx.fillText('GURUGRAM (HARYANA)', 230, 72);

  // 5. Left Circular Verified Seal Emblem
  ctx.save();
  ctx.translate(68, 138);
  // Outer circle
  ctx.beginPath();
  ctx.arc(0, 0, 32, 0, Math.PI * 2);
  ctx.fillStyle = '#eff6ff';
  ctx.fill();
  ctx.strokeStyle = primaryBlue;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner dashed circle
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.strokeStyle = accentBlue;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 2]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Checkmark icon
  ctx.strokeStyle = primaryBlue;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(-9, -2);
  ctx.lineTo(-2, 5);
  ctx.lineTo(9, -8);
  ctx.stroke();

  // Badge text
  ctx.font = '900 7px sans-serif';
  ctx.fillStyle = primaryBlue;
  ctx.letterSpacing = '0.5px';
  ctx.fillText('VERIFIED', 0, 14);
  ctx.font = '800 6.5px sans-serif';
  ctx.fillStyle = accentBlue;
  ctx.fillText('SEAL', 0, 22);
  ctx.restore();

  // 6. Cursive Signature: "TSaini" (First T, then overlaid S, then aini)
  ctx.save();
  ctx.translate(138, 80);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Cursive T
  ctx.strokeStyle = primaryBlue;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(32, 38);
  ctx.bezierCurveTo(44, 33, 64, 32, 88, 33);
  ctx.bezierCurveTo(98, 34, 104, 36, 108, 40);
  ctx.stroke();

  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(66, 34);
  ctx.bezierCurveTo(67, 52, 64, 78, 56, 114);
  ctx.bezierCurveTo(54, 122, 48, 125, 42, 121);
  ctx.stroke();

  // 2. Overlaid S: Swoops elegantly right over and across the T
  ctx.strokeStyle = inkDark;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(44, 80);
  ctx.bezierCurveTo(32, 74, 20, 60, 22, 44);
  ctx.bezierCurveTo(24, 26, 46, 14, 68, 13);
  ctx.bezierCurveTo(90, 12, 104, 24, 96, 42);
  ctx.bezierCurveTo(86, 62, 44, 82, 32, 100);
  ctx.bezierCurveTo(20, 118, 34, 126, 60, 123);
  ctx.bezierCurveTo(80, 120, 100, 108, 108, 96);
  ctx.stroke();

  // 3. 'a'
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(108, 100);
  ctx.bezierCurveTo(98, 92, 94, 102, 96, 110);
  ctx.bezierCurveTo(98, 118, 108, 120, 115, 114);
  ctx.bezierCurveTo(120, 110, 122, 98, 122, 94);
  ctx.lineTo(122, 118);
  ctx.stroke();

  // 4. 'i'
  ctx.beginPath();
  ctx.moveTo(124, 112);
  ctx.lineTo(136, 96);
  ctx.lineTo(136, 118);
  ctx.stroke();
  // Dot on first 'i'
  ctx.beginPath();
  ctx.arc(136, 86, 2.8, 0, Math.PI * 2);
  ctx.fillStyle = inkDark;
  ctx.fill();

  // 5. 'n'
  ctx.beginPath();
  ctx.moveTo(138, 114);
  ctx.lineTo(148, 98);
  ctx.lineTo(150, 118);
  ctx.moveTo(150, 104);
  ctx.bezierCurveTo(154, 97, 164, 96, 168, 104);
  ctx.lineTo(168, 118);
  ctx.stroke();

  // 6. 'i'
  ctx.beginPath();
  ctx.moveTo(170, 112);
  ctx.lineTo(180, 96);
  ctx.lineTo(182, 118);
  ctx.bezierCurveTo(188, 120, 208, 120, 224, 116);
  ctx.stroke();
  // Dot on second 'i'
  ctx.beginPath();
  ctx.arc(181, 86, 2.8, 0, Math.PI * 2);
  ctx.fill();

  // 7. Signature Flourish Underline
  ctx.beginPath();
  ctx.strokeStyle = primaryBlue;
  ctx.lineWidth = 2.2;
  ctx.moveTo(24, 130);
  ctx.bezierCurveTo(65, 128, 150, 130, 238, 123);
  ctx.stroke();
  ctx.restore();

  // 7. Divider Line
  ctx.strokeStyle = primaryBlue;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(42, 186);
  ctx.lineTo(418, 186);
  ctx.stroke();
  ctx.setLineDash([]);

  // 8. Footer: ★ AUTHORIZED SIGNATORY ★
  ctx.font = '900 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = primaryBlue;
  ctx.letterSpacing = '2px';
  ctx.fillText('★ AUTHORIZED SIGNATORY ★', 230, 206);

  ctx.restore();

  return canvas.toDataURL('image/png');
}

// Composite a user-drawn signature onto the official Tisha LED Walls stamp template
export function compositeDrawnStampDataUrl(
  drawnCanvas: HTMLCanvasElement,
  options?: {
    companyName?: string;
    location?: string;
    includeFrame?: boolean;
    primaryColor?: string;
  }
): string {
  if (typeof document === 'undefined') return '';

  const width = 460;
  const height = 240;

  if (options?.includeFrame === false) {
    return drawnCanvas.toDataURL('image/png');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return drawnCanvas.toDataURL('image/png');

  ctx.scale(2, 2);

  // Slight natural stamp tilt (-1.5 deg) for realistic stamp look
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((-1.5 * Math.PI) / 180);
  ctx.translate(-width / 2, -height / 2);

  const primaryBlue = options?.primaryColor || '#1e3a8a';
  const accentBlue = '#2563eb';

  // 1. Outer Rounded Rectangle Border
  ctx.strokeStyle = primaryBlue;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(14, 14, 432, 212, 14);
  } else {
    ctx.rect(14, 14, 432, 212);
  }
  ctx.fillStyle = 'rgba(248, 250, 255, 0.96)';
  ctx.fill();
  ctx.stroke();

  // 2. Inner Dashed Rounded Rectangle
  ctx.strokeStyle = primaryBlue;
  ctx.lineWidth = 1.4;
  ctx.setLineDash([7, 4]);
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(22, 22, 416, 196, 9);
  } else {
    ctx.rect(22, 22, 416, 196);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // 3. Top Header: Company Name
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = primaryBlue;
  ctx.letterSpacing = '2.5px';
  ctx.fillText((options?.companyName || 'TISHA LED WALLS').toUpperCase(), 230, 52);

  // 4. Sub-location
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = accentBlue;
  ctx.letterSpacing = '1.2px';
  ctx.fillText((options?.location || 'GURUGRAM (HARYANA)').toUpperCase(), 230, 72);

  // 5. Left Circular Verified Seal Emblem
  ctx.save();
  ctx.translate(68, 138);
  ctx.beginPath();
  ctx.arc(0, 0, 32, 0, Math.PI * 2);
  ctx.fillStyle = '#eff6ff';
  ctx.fill();
  ctx.strokeStyle = primaryBlue;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.strokeStyle = accentBlue;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 2]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = primaryBlue;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(-9, -2);
  ctx.lineTo(-2, 5);
  ctx.lineTo(9, -8);
  ctx.stroke();

  ctx.font = '900 7px sans-serif';
  ctx.fillStyle = primaryBlue;
  ctx.letterSpacing = '0.5px';
  ctx.fillText('VERIFIED', 0, 14);
  ctx.font = '800 6.5px sans-serif';
  ctx.fillStyle = accentBlue;
  ctx.fillText('SEAL', 0, 22);
  ctx.restore();

  // 6. Draw user's drawn signature
  ctx.drawImage(drawnCanvas, 0, 0, width, height);

  // 7. Divider Line
  ctx.strokeStyle = primaryBlue;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(42, 186);
  ctx.lineTo(418, 186);
  ctx.stroke();
  ctx.setLineDash([]);

  // 8. Footer: ★ AUTHORIZED SIGNATORY ★
  ctx.font = '900 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = primaryBlue;
  ctx.letterSpacing = '2px';
  ctx.fillText('★ AUTHORIZED SIGNATORY ★', 230, 206);

  ctx.restore();

  return canvas.toDataURL('image/png');
}
