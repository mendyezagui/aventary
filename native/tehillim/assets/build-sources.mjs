/**
 * Rasterises the app's own icon artwork into the two sources @capacitor/assets
 * wants. The SVG in public/tehillim is the original — everything else on both
 * stores is generated from it, so the harp only ever gets drawn once.
 */
import sharp from "sharp";
import { readFileSync } from "node:fs";

const SVG = readFileSync("../../public/tehillim/icon.svg");

// The icon: the artwork fills the square, exactly as the PWA and Play use it.
await sharp(SVG, { density: 600 }).resize(1024, 1024).png().toFile("assets/icon-only.png");

// Adaptive-icon halves, in case an Android build ever wants them: the harp on
// transparency, and the field on its own.
await sharp(SVG, { density: 600 })
  .resize(1024, 1024)
  .png()
  .toFile("assets/icon-foreground.png");
await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: "#1b2350" },
})
  .png()
  .toFile("assets/icon-background.png");

// The splash is 2732x2732 because it gets cropped to every shape of screen, so
// the harp sits small and dead centre with a lot of room around it.
const harp = await sharp(SVG, { density: 600 }).resize(760, 760).png().toBuffer();
for (const [name, bg] of [
  ["splash.png", "#f3ece0"],
  ["splash-dark.png", "#121838"],
]) {
  await sharp({ create: { width: 2732, height: 2732, channels: 4, background: bg } })
    .composite([{ input: harp, gravity: "centre" }])
    .png()
    .toFile(`assets/${name}`);
}

console.log("sources written");
