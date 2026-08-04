import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "fs";

const OUT = "/home/user/aventary/public/tehillim";
mkdirSync(OUT, { recursive: true });

// David's harp (kinor) in gold on a techeiles-blue rounded field.
const svg = (rx) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#31418c"/>
      <stop offset="1" stop-color="#121838"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f6d986"/>
      <stop offset="0.55" stop-color="#dcab44"/>
      <stop offset="1" stop-color="#b7802a"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${rx}" fill="url(#bg)"/>
  <g stroke="#efce70" stroke-width="7" stroke-linecap="round" opacity="0.9">
    <line x1="214" y1="152" x2="250" y2="356"/>
    <line x1="242" y1="146" x2="274" y2="322"/>
    <line x1="270" y1="146" x2="298" y2="288"/>
    <line x1="300" y1="150" x2="320" y2="256"/>
    <line x1="328" y1="160" x2="342" y2="224"/>
  </g>
  <g stroke="url(#gold)" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M190 150 L190 366" stroke-width="27"/>
    <path d="M184 152 C 252 116, 324 126, 360 184" stroke-width="24"/>
    <path d="M360 184 L 236 382" stroke-width="27"/>
    <path d="M190 366 L 236 382" stroke-width="27"/>
  </g>
</svg>`;

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
  args: ["--no-sandbox"],
});

async function raster(name, size, rx) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>*{margin:0;padding:0}html,body{background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg(rx)}`,
    { waitUntil: "load" }
  );
  await page.screenshot({ path: `${OUT}/${name}`, omitBackground: true });
  await page.close();
  console.log("wrote", name, size, "rx", rx);
}

// rounded (purpose any) + square full-bleed (maskable / apple)
await raster("icon-192.png", 192, 42);
await raster("icon-512.png", 512, 112);
await raster("icon-maskable-512.png", 512, 0);
await raster("apple-touch-icon.png", 180, 0);
// a big preview to eyeball
await raster("_preview.png", 320, 70);

writeFileSync(`${OUT}/icon.svg`, svg(112));
console.log("wrote icon.svg");

await browser.close();
console.log("DONE");
