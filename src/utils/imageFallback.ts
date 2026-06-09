/**
 * Client-Side Image Fallback & Placeholder Engine
 * Dynamically generates beautiful, atmospheric SVG placeholders in dark slate and gold themes
 * matching the aesthetic style "African Echo".
 */

export function getClientPlaceholderSvg(filename: string, altText?: string): string {
  let title = "African Echo";
  let subtitle = "Official Asset";
  let type: "hero" | "portrait" | "vinyl" | "gallery" = "gallery";

  const lowerFilename = (filename || "").toLowerCase();
  const lowerAlt = (altText || "").toLowerCase();

  if (
    lowerFilename.includes("1779062374784") || 
    lowerFilename.includes("hero") || 
    lowerAlt.includes("hero")
  ) {
    title = "African Echo";
    subtitle = "Ugandan Singer & Songwriter based in Kampala";
    type = "hero";
  } else if (
    lowerFilename.includes("1779062385599") || 
    lowerFilename.includes("portrait") || 
    lowerAlt.includes("portrait")
  ) {
    title = "African Echo";
    subtitle = "Official Portrait";
    type = "portrait";
  } else if (lowerFilename.includes("1779059927958") || lowerFilename.includes("owomesa") || lowerAlt.includes("owomesa")) {
    title = "OWOMESA";
    subtitle = "Single by African Echo";
    type = "vinyl";
  } else if (lowerFilename.includes("1779065828285") || lowerFilename.includes("your love") || lowerAlt.includes("your love")) {
    title = "Your Love";
    subtitle = "Track by African Echo";
    type = "vinyl";
  } else if (lowerFilename.includes("1779066414277") || lowerFilename.includes("monalisa") || lowerAlt.includes("monalisa")) {
    title = "Monalisa";
    subtitle = "Track by African Echo";
    type = "vinyl";
  } else if (lowerFilename.includes("1779066825429") || lowerFilename.includes("party") || lowerAlt.includes("party")) {
    title = "Party";
    subtitle = "Track by African Echo";
    type = "vinyl";
  } else if (lowerFilename.includes("1779066953182")) {
    title = "Your Love EP";
    subtitle = "EP by African Echo";
    type = "vinyl";
  } else if (lowerFilename.includes("1779067551431")) {
    title = "Owomesa Live";
    subtitle = "African Echo Gallery";
    type = "gallery";
  } else if (lowerFilename.includes("1779067603127")) {
    title = "Live Performance";
    subtitle = "Kampala Music";
    type = "gallery";
  } else if (lowerFilename.includes("1779067694988")) {
    title = "Studio Session";
    subtitle = "African Echo Gallery";
    type = "gallery";
  } else if (lowerFilename.includes("1779068062724")) {
    title = "Behind The Scenes";
    subtitle = "Ugandan Songwriter";
    type = "gallery";
  } else if (lowerFilename.includes("1779068141474")) {
    title = "Uganda Vibes";
    subtitle = "African Echo Gallery";
    type = "gallery";
  } else if (lowerFilename.includes("1779068235778")) {
    title = "On Stage";
    subtitle = "Live in Kampala";
    type = "gallery";
  } else if (lowerAlt.includes("cover") || lowerAlt.includes("album") || lowerAlt.includes("song") || lowerAlt.includes("track")) {
    title = altText ? altText.replace(/[_-]/g, ' ') : "Track Cover";
    subtitle = "Single by African Echo";
    type = "vinyl";
  } else if (altText) {
    title = altText.replace(/[_-]/g, ' ');
    subtitle = "African Echo Gallery";
    type = "gallery";
  }

  // Choose aspect ratio / sizes matching the context
  let width = 800;
  let height = 800;
  if (type === "hero") {
    width = 1600;
    height = 900;
  } else if (type === "portrait") {
    width = 600;
    height = 800;
  }

  const backgroundGradient = `
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1e1b18;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#120f0d;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#0d0a08;stop-opacity:1" />
      </linearGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#d4af37;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#f3e5ab;stop-opacity:1" />
      </linearGradient>
      <linearGradient id="sunset" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#f0932b;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#eb4c3b;stop-opacity:1" />
      </linearGradient>
    </defs>
  `;

  let innerContent = "";

  if (type === "hero") {
    innerContent = `
      <g stroke="url(#gold)" stroke-width="2" fill="none" opacity="0.15">
        <path d="M 0,450 Q 400,300 800,450 T 1600,450" />
        <path d="M 0,480 Q 400,380 800,420 T 1600,480" />
        <path d="M 0,510 Q 400,460 800,390 T 1600,510" />
      </g>
      
      <circle cx="800" cy="450" r="400" fill="url(#sunset)" opacity="0.08" />

      <g transform="translate(150, 450)">
        <text font-family="'Space Grotesk', system-ui, sans-serif" font-weight="900" font-size="84" letter-spacing="-1.5" fill="url(#gold)" y="-20">${title.toUpperCase()}</text>
        <text font-family="'Space Grotesk', system-ui, sans-serif" font-weight="300" font-size="28" letter-spacing="4" fill="#a8a29e" y="40">${subtitle.toUpperCase()}</text>
        <rect x="0" y="80" width="120" height="4" fill="url(#sunset)" rx="2" />
      </g>
    `;
  } else if (type === "portrait") {
    innerContent = `
      <g transform="translate(300, 400)">
        <circle cx="0" cy="-100" r="70" fill="none" stroke="url(#gold)" stroke-width="2" opacity="0.4" />
        <text font-family="'Space Grotesk', system-ui, sans-serif" font-weight="300" font-size="44" fill="url(#gold)" text-anchor="middle" dominant-baseline="central" y="-103" letter-spacing="2">AE</text>
        
        <text font-family="'Space Grotesk', system-ui, sans-serif" font-weight="800" font-size="36" fill="#f5f5f4" text-anchor="middle" y="20" letter-spacing="1">${title.toUpperCase()}</text>
        <text font-family="'Space Grotesk', system-ui, sans-serif" font-weight="400" font-size="16" fill="#a8a29e" text-anchor="middle" y="60" letter-spacing="3">${subtitle.toUpperCase()}</text>
        
        <line x1="-40" y1="90" x2="40" y2="90" stroke="url(#sunset)" stroke-width="2" />
      </g>
    `;
  } else if (type === "vinyl") {
    innerContent = `
      <g opacity="0.7" transform="translate(400, 320)">
        <circle cx="0" cy="0" r="160" fill="#18181b" stroke="#27272a" stroke-width="6" />
        <circle cx="0" cy="0" r="140" fill="none" stroke="#27272a" stroke-dasharray="10 5" stroke-width="1" />
        <circle cx="0" cy="0" r="120" fill="none" stroke="#27272a" stroke-width="1" />
        <circle cx="0" cy="0" r="100" fill="none" stroke="#27272a" stroke-dasharray="15 6" stroke-width="1" />
        <circle cx="0" cy="0" r="80" fill="none" stroke="#27272a" stroke-width="1" />
        <circle cx="0" cy="0" r="60" fill="url(#sunset)" />
        <circle cx="0" cy="0" r="20" fill="#0d0a08" />
        <circle cx="0" cy="0" r="6" fill="#1e1b18" />
      </g>

      <g transform="translate(400, 560)">
        <text font-family="'Space Grotesk', system-ui, sans-serif" font-weight="800" font-size="38" fill="#f5f5f4" text-anchor="middle" letter-spacing="-0.5">${title}</text>
        <text font-family="'Space Grotesk', system-ui, sans-serif" font-weight="400" font-size="16" fill="url(#gold)" text-anchor="middle" y="35" letter-spacing="4">${subtitle.toUpperCase()}</text>
      </g>
    `;
  } else {
    innerContent = `
      <g transform="translate(400, 400)">
        <circle cx="0" cy="-60" r="50" fill="none" stroke="url(#gold)" stroke-width="2" stroke-dasharray="30 10" />
        <circle cx="0" cy="-60" r="25" fill="none" stroke="url(#sunset)" stroke-width="1.5" />
        
        <text font-family="'Space Grotesk', system-ui, sans-serif" font-weight="700" font-size="32" fill="#e7e5e4" text-anchor="middle" y="40" letter-spacing="-0.5">${title}</text>
        <text font-family="'Space Grotesk', system-ui, sans-serif" font-weight="300" font-size="15" fill="#a8a29e" text-anchor="middle" y="75" letter-spacing="3">${subtitle.toUpperCase()}</text>
      </g>
    `;
  }

  const fullSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
      ${backgroundGradient}
      <rect width="100%" height="100%" fill="url(#bg)" />
      <rect x="20" y="20" width="${width - 40}" height="${height - 40}" fill="none" stroke="#2e2a24" stroke-width="1" opacity="0.3" rx="8" />
      ${innerContent}
    </svg>
  `.trim();

  // Return a web-safe Data URI that works as an Image src directly
  return `data:image/svg+xml;utf8,${encodeURIComponent(fullSvg)}`;
}
