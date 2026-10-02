import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
const prism = await sharp("public/images/prism-dark2-cool.webp").resize(560, 506).png().toBuffer();
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="white"/><g font-family="Arial, sans-serif" fill="#101011"><text x="64" y="64" font-size="25">Hayyaun</text><text x="64" y="191" font-size="88" font-weight="700" letter-spacing="-5">Clarity.</text><text x="64" y="282" font-size="88" font-weight="700" letter-spacing="-5">Depth.</text><text x="64" y="373" font-size="88" font-weight="700" letter-spacing="-5">Character.</text><text x="66" y="434" font-size="24" fill="#7d7594">Frontend development, motion,</text><text x="66" y="468" font-size="24" fill="#7d7594">and interactive 3D.</text><text x="64" y="581" font-size="21">hayyaun.ir</text></g><path d="M64 536H1136" stroke="#e5e1eb"/></svg>`;
await sharp(Buffer.from(svg)).composite([{ input: prism, left: 606, top: 24 }]).png().toFile("app/opengraph-image.png");
await writeFile("app/twitter-image.png", await readFile("app/opengraph-image.png"));
await sharp("app/icon.svg").resize(180,180).png().toFile("app/apple-icon.png");
console.log("Generated OG and Twitter images (1200×630), Apple icon (180×180).");