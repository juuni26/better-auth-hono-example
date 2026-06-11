/* Visual QA: walks the real flow (signup → onboarding → demo payment →
 * dashboard → account/settings/billing) and screenshots every page at
 * mobile (375) and desktop (1280). Usage: node scripts/screenshot.mjs */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const OUT = new URL("../shots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const email = `qa-${Date.now()}@vellum.demo`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "shell",
  args: ["--no-sandbox", "--hide-scrollbars"],
});

const page = await browser.newPage();

async function shot(name, width, height = width < 500 ? 812 : 800) {
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: `${OUT}${name}-${width}.png` });
  console.log(`✓ ${name}-${width}.png`);
}

// ---- Landing
await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 2200)); // let hero animation settle
await shot("landing", 1280);
await shot("landing", 375);

// ---- Signup
await page.goto(`${BASE}/signup?plan=plus`, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 800));
await shot("signup", 1280);
await shot("signup", 375);

await page.setViewport({ width: 1280, height: 800 });
await page.type("#name", "Ada Lovelace");
await page.type("#email", email);
await page.type("#password", "correct-horse-battery");
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}),
  page.click("button[type=submit]"),
]);
await page.waitForFunction(() => location.pathname.includes("onboarding"), { timeout: 10000 });
await new Promise((r) => setTimeout(r, 1000));

// ---- Onboarding
await shot("onboarding", 1280);
await shot("onboarding", 375);

// ---- Pay (demo ceremony)
await page.setViewport({ width: 1280, height: 800 });
const buttons = await page.$$("button");
for (const b of buttons) {
  const text = await b.evaluate((el) => el.textContent);
  if (text?.includes("Activate Plus")) {
    await b.click();
    break;
  }
}
await new Promise((r) => setTimeout(r, 1200));
await shot("payment-ceremony", 1280);
await page.waitForFunction(() => location.pathname.includes("dashboard"), { timeout: 15000 });
await new Promise((r) => setTimeout(r, 2000));

// ---- Dashboard
await shot("dashboard", 1280);
await shot("dashboard", 375);

// ---- Account / Settings / Billing
for (const route of ["account", "settings", "billing"]) {
  await page.goto(`${BASE}/${route}`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 900));
  await shot(route, 1280);
  await shot(route, 375);
}

// ---- Login
await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
await shot("login", 1280);

await browser.close();
console.log("done");
