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

  // 3. Top Header: FOR TISHA LED WALLS
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = primaryBlue;
  ctx.letterSpacing = '2.5px';
  ctx.fillText('FOR TISHA LED WALLS', 230, 52);

  // 4. Sub-location
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = accentBlue;
  ctx.letterSpacing = '1.2px';
  ctx.fillText('GURUGRAM (HARYANA) • SECTOR 39', 230, 72);

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

  // 6. Cursive Signature: "Saini"
  ctx.save();
  ctx.translate(140, 80);
  ctx.strokeStyle = inkDark;
  ctx.lineWidth = 2.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Capital 'S'
  ctx.beginPath();
  ctx.moveTo(52, 70);
  ctx.bezierCurveTo(36, 66, 24, 56, 25, 42);
  ctx.bezierCurveTo(26, 26, 48, 14, 68, 14);
  ctx.bezierCurveTo(84, 14, 94, 24, 88, 38);
  ctx.bezierCurveTo(80, 56, 42, 76, 32, 92);
  ctx.bezierCurveTo(20, 110, 34, 122, 58, 120);
  ctx.bezierCurveTo(78, 118, 96, 106, 106, 94);
  ctx.stroke();

  // 'a'
  ctx.beginPath();
  ctx.moveTo(106, 100);
  ctx.bezierCurveTo(98, 92, 94, 102, 96, 110);
  ctx.bezierCurveTo(98, 118, 108, 120, 115, 114);
  ctx.bezierCurveTo(120, 110, 122, 98, 122, 94);
  ctx.lineTo(122, 118);
  ctx.stroke();

  // 'i'
  ctx.beginPath();
  ctx.moveTo(124, 112);
  ctx.lineTo(136, 96);
  ctx.lineTo(136, 118);
  ctx.stroke();
  // Dot on first 'i'
  ctx.beginPath();
  ctx.arc(136, 86, 2.6, 0, Math.PI * 2);
  ctx.fillStyle = inkDark;
  ctx.fill();

  // 'n'
  ctx.beginPath();
  ctx.moveTo(138, 114);
  ctx.lineTo(148, 98);
  ctx.lineTo(150, 118);
  ctx.moveTo(150, 104);
  ctx.bezierCurveTo(154, 97, 164, 96, 168, 104);
  ctx.lineTo(168, 118);
  ctx.stroke();

  // 'i'
  ctx.beginPath();
  ctx.moveTo(170, 112);
  ctx.lineTo(180, 96);
  ctx.lineTo(182, 118);
  ctx.bezierCurveTo(188, 120, 204, 120, 218, 116);
  ctx.stroke();
  // Dot on second 'i'
  ctx.beginPath();
  ctx.arc(181, 86, 2.6, 0, Math.PI * 2);
  ctx.fill();

  // Signature Flourish Underline
  ctx.beginPath();
  ctx.strokeStyle = primaryBlue;
  ctx.lineWidth = 2.2;
  ctx.moveTo(26, 130);
  ctx.bezierCurveTo(65, 128, 150, 130, 230, 123);
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
