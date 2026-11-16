const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.BROWSER_PATH ||
      (require("node:fs").existsSync("/usr/bin/chromium")
        ? "/usr/bin/chromium"
        : undefined),
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
  await page.goto(base);
  await page.waitForLoadState("networkidle");
  console.log("home", await page.title(), await page.locator("h1").innerText());
  if (process.env.SCREENSHOT_DIR) {
    require("node:fs").mkdirSync(process.env.SCREENSHOT_DIR, {
      recursive: true,
    });
    await page.screenshot({
      path: process.env.SCREENSHOT_DIR + "/home-desktop.png",
      fullPage: true,
    });
  }
  assert.ok(
    (await page.locator("h1").innerText()).includes("Seu próximo imóvel"),
  );
  const locales = {
    pt: "Imóveis disponíveis",
    en: "Available homes",
    es: "Inmuebles disponibles",
    it: "Immobili disponibili",
    fr: "Logements disponibles",
    pl: "Dostępne nieruchomości",
  };
  for (const [locale, title] of Object.entries(locales)) {
    await page.goto(
      base +
        "/imoveis?occupancy=couple&maxPrice=1200&priceFrequency=month&region=West",
    );
    await page.getByLabel("Language / Idioma").selectOption(locale);
    await page.waitForFunction(
      (expected) => document.documentElement.lang === expected,
      locale === "pt" ? "pt-BR" : locale,
    );
    await page.getByRole("heading", { name: title, exact: true }).waitFor();
    assert.ok(page.url().includes("occupancy=couple"));
    assert.ok(page.url().includes("priceFrequency=month"));
    assert.equal(await page.locator("[name=maxPrice]").inputValue(), "1200");
    await page.reload();
    assert.equal(
      await page.getByLabel("Language / Idioma").inputValue(),
      locale,
    );
    await page.goto(base);
    await page.getByRole("heading", { name: title, exact: true }).waitFor();
    console.log(
      locale,
      "home, catalogue, persistence and preserved filters OK",
    );
  }
  await page.goto(
    base + "/imoveis?occupancy=couple&maxPrice=1200&priceFrequency=month",
  );
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page
    .getByRole("heading", { name: "Available homes", exact: true })
    .waitFor();
  assert.ok(page.url().includes("priceFrequency=month"));
  assert.equal(
    await page
      .getByRole("button", { name: "English", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.reload();
  assert.equal(await page.getByLabel("Language / Idioma").inputValue(), "en");
  console.log("English shortcut preserves filters and language preference");
  await page.goto(base + "/admin/login");
  assert.equal(await page.locator("html").getAttribute("lang"), "pt-BR");
  assert.equal(await page.getByLabel("Language / Idioma").count(), 0);
  await page
    .getByText("Painel indisponível: configuração do Supabase ausente.")
    .waitFor();
  console.log("admin Portuguese and missing configuration state OK");
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    assert.equal(overflow, false, `overflow at ${width}`);
    assert.ok(
      await page
        .getByRole("button", { name: "English", exact: true })
        .isVisible(),
    );
    assert.ok(await page.getByLabel("Language / Idioma").isVisible());
    if (process.env.SCREENSHOT_DIR)
      await page.screenshot({
        path: `${process.env.SCREENSHOT_DIR}/home-${width}.png`,
        fullPage: true,
      });
    console.log("viewport", width, "no overflow");
  }
  await page.goto(base);
  const lead = page.locator("form").nth(1);
  assert.equal(await lead.evaluate((f) => f.checkValidity()), false);
  await lead.locator('[name="Tipo de imóvel"]').fill("Studio");
  await lead.locator('[name="Região"]').fill("West");
  await lead.locator('[name="Ocupantes"]').fill("1");
  await lead.locator('[name="Máximo em GBP"]').fill("1200");
  await lead.locator('[name="Data"]').fill("2026-12-01");
  assert.equal(await lead.evaluate((f) => f.checkValidity()), false);
  await lead.locator("[name=consent]").check();
  assert.equal(await lead.evaluate((f) => f.checkValidity()), true);
  await lead.locator("button").click();
  await lead.getByRole("alert").waitFor();
  console.log(
    "Lead form enforces consent and shows unconfigured WhatsApp state",
  );
  for (const path of ["/admin", "/admin/imoveis", "/admin/imoveis/novo"]) {
    await page.goto(base + path);
    await page.waitForURL("**/admin/login");
  }
  console.log("Unauthenticated admin navigation redirects to login");
  assert.deepEqual(errors, []);
  console.log("No browser runtime errors");
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
