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
      letter-spacing="2.8">FOR TISHA LED WALLS</text>

    <!-- Subtitle / Location with valid XML entity -->
    <text x="230" y="78" 
      text-anchor="middle" 
      fill="#2563eb" 
      font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
      font-size="10.5" 
      font-weight="700" 
      letter-spacing="1.2">GURUGRAM (HARYANA) &#8226; SECTOR 39</text>

    <!-- Left Badge / Round Official Seal Icon -->
    <g transform="translate(65, 138)">
      <circle cx="0" cy="0" r="34" fill="#eff6ff" stroke="#1e3a8a" stroke-width="2.2" />
      <circle cx="0" cy="0" r="28" fill="none" stroke="#2563eb" stroke-width="1" stroke-dasharray="3 2" />
      <path d="M-10,-5 L-3,2 L10,-11" fill="none" stroke="#1e3a8a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="0" y="14" text-anchor="middle" fill="#1e3a8a" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="7.5" font-weight="900" letter-spacing="0.5">VERIFIED</text>
      <text x="0" y="23" text-anchor="middle" fill="#2563eb" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="6.5" font-weight="800">SEAL</text>
    </g>

    <!-- Beautiful Cursive Signature "Saini" (Authorized Signatory) -->
    <g transform="translate(145, 82)">
      <!-- S -->
      <path d="M 52 72 C 38 68, 25 58, 26 44 C 27 28, 48 16, 68 15 C 84 14, 96 24, 90 38 C 82 56, 44 76, 32 94 C 20 112, 34 125, 58 123 C 80 121, 98 108, 108 96" 
        fill="none" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
      
      <!-- a -->
      <path d="M 106 102 C 98 94, 94 104, 96 112 C 98 120, 108 122, 115 116 C 120 112, 122 100, 122 96 L 122 120" 
        fill="none" stroke="#0f172a" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />

      <!-- i -->
      <path d="M 124 114 L 136 98 L 136 120" 
        fill="none" stroke="#0f172a" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
      <!-- Dot on first i -->
      <circle cx="136" cy="88" r="2.8" fill="#0f172a" />

      <!-- n -->
      <path d="M 138 116 L 148 100 L 150 120 M 150 106 C 154 99, 164 98, 168 106 L 168 120" 
        fill="none" stroke="#0f172a" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />

      <!-- i -->
      <path d="M 170 114 L 180 98 L 182 120 C 188 122, 206 122, 222 118" 
        fill="none" stroke="#0f172a" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
      <!-- Dot on second i -->
      <circle cx="181" cy="88" r="2.8" fill="#0f172a" />

      <!-- Flourish Underline -->
      <path d="M 28 132 C 65 130, 150 132, 235 125 C 245 124, 252 122, 258 120" 
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
