import fs from 'fs';

const stampSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 250" width="460" height="250">
  <g transform="rotate(-2.2 230 125)">
    <!-- Outer stamp container with double border -->
    <rect x="15" y="15" width="430" height="220" rx="14" ry="14" 
      fill="#f8faff" fill-opacity="0.9" 
      stroke="#1e3a8a" stroke-width="3.5" 
      stroke-linecap="round" stroke-linejoin="round" />
    
    <rect x="23" y="23" width="414" height="204" rx="9" ry="9" 
      fill="none" 
      stroke="#1e3a8a" stroke-width="1.4" stroke-dasharray="8 4" />

    <!-- Top Company Header -->
    <text x="230" y="58" 
      text-anchor="middle" 
      fill="#1e3a8a" 
      font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
      font-size="20" 
      font-weight="900" 
      letter-spacing="2.8">TISHA LED WALLS</text>

    <!-- Subtitle / Location -->
    <text x="230" y="78" 
      text-anchor="middle" 
      fill="#2563eb" 
      font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
      font-size="10.5" 
      font-weight="700" 
      letter-spacing="1.2">GURUGRAM (HARYANA)</text>

    <!-- Left Badge / Round Official Seal Icon -->
    <g transform="translate(65, 138)">
      <circle cx="0" cy="0" r="34" fill="#eff6ff" stroke="#1e3a8a" stroke-width="2.2" />
      <circle cx="0" cy="0" r="28" fill="none" stroke="#2563eb" stroke-width="1" stroke-dasharray="3 2" />
      <path d="M-10,-5 L-3,2 L10,-11" fill="none" stroke="#1e3a8a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="0" y="14" text-anchor="middle" fill="#1e3a8a" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="7.5" font-weight="900" letter-spacing="0.5">VERIFIED</text>
      <text x="0" y="23" text-anchor="middle" fill="#2563eb" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="6.5" font-weight="800">SEAL</text>
    </g>

    <!-- Beautiful Cursive Signature "TSaini" (First T, then overlaid S, then aini) -->
    <g transform="translate(138, 80)">
      <!-- 1. Cursive T: Top Bar and Downward Stem -->
      <!-- T Top Bar with stylish loop/wave -->
      <path d="M 32 38 C 44 33, 64 32, 88 33 C 98 34, 104 36, 108 40" 
        fill="none" stroke="#1e3a8a" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" />
      <!-- T Vertical Stem -->
      <path d="M 66 34 C 67 52, 64 78, 56 114 C 54 122, 48 125, 42 121" 
        fill="none" stroke="#1e3a8a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />

      <!-- 2. Overlaid S: Swoops elegantly right over and across the T -->
      <path d="M 44 80 C 32 74, 20 60, 22 44 C 24 26, 46 14, 68 13 C 90 12, 104 24, 96 42 C 86 62, 44 82, 32 100 C 20 118, 34 126, 60 123 C 80 120, 100 108, 108 96" 
        fill="none" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
      
      <!-- 3. 'a' -->
      <path d="M 108 100 C 98 92, 94 102, 96 110 C 98 118, 108 120, 115 114 C 120 110, 122 98, 122 94 L 122 118" 
        fill="none" stroke="#0f172a" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />

      <!-- 4. 'i' -->
      <path d="M 124 112 L 136 96 L 136 118" 
        fill="none" stroke="#0f172a" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
      <!-- Dot on first i -->
      <circle cx="136" cy="86" r="2.8" fill="#0f172a" />

      <!-- 5. 'n' -->
      <path d="M 138 114 L 148 98 L 150 118 M 150 104 C 154 97, 164 96, 168 104 L 168 118" 
        fill="none" stroke="#0f172a" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />

      <!-- 6. 'i' -->
      <path d="M 170 112 L 180 96 L 182 118 C 188 120, 208 120, 224 116" 
        fill="none" stroke="#0f172a" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
      <!-- Dot on second i -->
      <circle cx="181" cy="86" r="2.8" fill="#0f172a" />

      <!-- 7. Flourish Underline -->
      <path d="M 24 130 C 65 128, 150 130, 238 123 C 248 122, 256 120, 262 118" 
        fill="none" stroke="#1e3a8a" stroke-width="2.2" stroke-linecap="round" />
    </g>

    <!-- Bottom Authorized Signatory label with stars -->
    <line x1="45" y1="188" x2="415" y2="188" stroke="#1e3a8a" stroke-width="1.2" stroke-dasharray="4 3" />
    
    <text x="230" y="209" 
      text-anchor="middle" 
      fill="#1e3a8a" 
      font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
      font-size="12.5" 
      font-weight="900" 
      letter-spacing="2">&#9733; AUTHORIZED SIGNATORY &#9733;</text>
  </g>
</svg>`;

const base64Svg = `data:image/svg+xml;base64,${Buffer.from(stampSvg).toString('base64')}`;
console.log('Stamp generated. Length:', base64Svg.length);
fs.writeFileSync('src/config/officialStamp.ts', `// Auto-generated official company stamp and signature for Tisha LED Walls\nexport const OFFICIAL_TISHA_STAMP = ${JSON.stringify(base64Svg)};\n`);
console.log('Saved to src/config/officialStamp.ts');
