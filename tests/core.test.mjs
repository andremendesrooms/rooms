import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const code = ts.transpileModule(
    fs.readFileSync(new URL("../" + file, import.meta.url), "utf8"),
    {
      fileName: file,
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const exports = {};
  vm.runInNewContext(
    code,
    {
      exports,
      require: (name) => (name in mocks ? mocks[name] : require(name)),
      process,
      console,
      URL,
      Set,
      Map,
      Array,
      Number,
      Intl,
      Error,
      AbortSignal,
    },
    { filename: file },
  );
  return exports;
}
const photos = load("lib/photo-order.ts");
const publication = load("lib/publication.ts");
const format = load("lib/format.ts");
const media = load("lib/photo-url.ts");
test("photo ordering preserves cover, originals, and complete manual room groups", () => {
  const current = [
    { id: "b", room_group: "Bedroom" },
    { id: "w", room_group: "Bathroom" },
    { id: "b2", room_group: "Bedroom" },
    { id: "w2", room_group: "Bathroom" },
    { id: "unknown" },
  ];
  const actual = photos.preserveCoverOrder(current, [
    "w",
    "b2",
    "w2",
    "b",
    "b",
    "evil",
  ]);
  assert.deepEqual(Array.from(actual), ["b", "b2", "w", "w2", "unknown"]);
  assert.equal(photos.preserveCoverOrder([], []).length, 0);
});
const ready = {
  status: "inactive",
  hidden: true,
  validation_status: "ok",
  pending_price: null,
  price: 250,
  postcode: "SW1",
  type: "Double Room",
  available_from: "2026-12-01",
};
test("publication requires verified real data, approved validation, and resolved price review", () => {
  assert.throws(
    () => publication.publicationChange(ready, "publish", false),
    /real/,
  );
  for (const patch of [
    { validation_status: "incomplete" },
    { pending_price: 300 },
    { price: 0 },
    { price: NaN },
    { postcode: "" },
    { available_from: null },
  ])
    assert.throws(() =>
      publication.publicationChange({ ...ready, ...patch }, "publish", true),
    );
  assert.equal(
    JSON.stringify(publication.publicationChange(ready, "publish", true)),
    JSON.stringify({ status: "available", hidden: false }),
  );
  assert.equal(
    JSON.stringify(publication.publicationChange(ready, "hide", false)),
    JSON.stringify({ hidden: true }),
  );
  assert.equal(
    JSON.stringify(publication.publicationChange(ready, "rent", false)),
    JSON.stringify({ status: "rented", hidden: true }),
  );
  assert.throws(
    () => publication.publicationChange(ready, "invalid", true),
    /inválida/,
  );
});
test("photo URLs reject cross-project content, credentials, private buckets and deceptive hosts", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  const good =
    "https://project.supabase.co/storage/v1/object/public/property-images/properties/abc/photo.jpg";
  assert.equal(media.isTrustedPropertyPhotoUrl(good), true);
  for (const url of [
    good.replace("project.", "other."),
    good.replace("https:", "http:"),
    good.replace("public/property-images", "public/private"),
    good.replace("project.supabase.co", "project.supabase.co.evil.com"),
    good.replace("https://", "https://user:pass@"),
    good.replace(".co/", ".co:999/"),
    "javascript:alert(1)",
    null,
  ])
    assert.equal(media.isTrustedPropertyPhotoUrl(url), false);
});
test("WhatsApp links encode the correct reference and reject unconfigured numbers", () => {
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "447700900123";
  const url = new URL(format.whatsappLink("id-123", "Room & studio"));
  assert.equal(url.pathname, "/447700900123");
  assert.match(url.searchParams.get("text"), /id-123 \(Room & studio\)/);
  for (const invalid of ["", "javascript:alert(1)", "+44 7700"]) {
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = invalid;
    assert.equal(format.whatsappLink("id-123"), "");
  }
});
function mockQueries(responses = {}) {
  const calls = [];
  const supabase = {
    from(table) {
      const call = { table, filters: [], orders: [], columns: null };
      calls.push(call);
      const query = {
        select(columns) {
          call.columns = columns;
          return query;
        },
        eq(...args) {
          call.filters.push(["eq", ...args]);
          return query;
        },
        neq(...args) {
          call.filters.push(["neq", ...args]);
          return query;
        },
        in(...args) {
          call.filters.push(["in", ...args]);
          return query;
        },
        lte(...args) {
          call.filters.push(["lte", ...args]);
          return query;
        },
        gte(...args) {
          call.filters.push(["gte", ...args]);
          return query;
        },
        order(...args) {
          call.orders.push(args);
          return query;
        },
        limit(value) {
          call.limit = value;
          return query;
        },
        maybeSingle() {
          call.single = true;
          return query;
        },
        then(resolve, reject) {
          return Promise.resolve(
            responses[table] ?? { data: call.single ? null : [], error: null },
          ).then(resolve, reject);
        },
      };
      return query;
    },
  };
  return {
    calls,
    api: load("lib/queries.ts", {
      "./supabase": { supabase },
      "./photo-url": media,
    }),
  };
}
test("all public property reads use the safe view, explicit fields and available status", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-only";
  const { calls, api } = mockQueries();
  await api.getFeaturedProperties();
  await api.getNewProperties();
  await api.getProperties();
  await api.getPropertyById("x");
  await api.getAvailableTypes();
  await api.getAvailableRegions();
  await api.getSimilarProperties({
    id: "x",
    type: "Flat",
    region: "West",
    price: 300,
  });
  assert.equal(calls.length, 7);
  for (const call of calls) {
    assert.equal(call.table, "properties_public");
    assert.ok(
      call.filters.some(
        (f) =>
          JSON.stringify(f) === JSON.stringify(["eq", "status", "available"]),
      ),
    );
    assert.ok(!call.columns.includes("*"));
    for (const forbidden of [
      "address",
      "latitude",
      "longitude",
      "landlord",
      "commission",
      "internal_notes",
    ])
      assert.ok(!call.columns.split(",").includes(forbidden));
  }
});
test("budget filters match their declared weekly/monthly period and reject NaN", async () => {
  const { calls, api } = mockQueries();
  await api.getProperties({
    maxPrice: 1200,
    priceFrequency: "month",
    region: "West",
    type: "Flat",
    occupancy: "couple",
    availableFrom: "2026-12-01",
  });
  assert.ok(
    calls[0].filters.some(
      (f) =>
        JSON.stringify(f) ===
        JSON.stringify(["eq", "price_frequency", "month"]),
    ),
  );
  assert.ok(
    calls[0].filters.some(
      (f) => JSON.stringify(f) === JSON.stringify(["lte", "price", 1200]),
    ),
  );
  await api.getProperties({ maxPrice: NaN });
  assert.ok(!calls[1].filters.some((f) => f[1] === "price"));
});
test("property photos stay sorted, reject foreign media and belong only to fetched ids", async () => {
  const { calls, api } = mockQueries({
    properties_public: { data: [{ id: "a", type: "Flat" }], error: null },
    property_photos: {
      data: [
        {
          property_id: "a",
          url: "https://project.supabase.co/storage/v1/object/public/property-images/properties/a/1.jpg",
          sort_order: 0,
        },
        { property_id: "a", url: "https://evil.com/photo.jpg", sort_order: 1 },
      ],
      error: null,
    },
  });
  const result = await api.getProperties();
  assert.equal(result[0].photos.length, 1);
  assert.equal(calls[1].table, "property_photos");
  assert.equal(calls[1].orders[0][0], "sort_order");
  assert.equal(calls[1].filters[0][1], "property_id");
});
test("catalogue outage is not silently reported as zero available properties", async () => {
  const { api } = mockQueries({
    properties_public: { data: null, error: { message: "test outage" } },
  });
  await assert.rejects(api.getProperties(), /indisponível/);
  await assert.rejects(api.getPropertyById("x"), /indisponível/);
});
test("every dictionary entry supplies six nonempty translations", () => {
  const catalog = JSON.parse(
    fs.readFileSync(new URL("../lib/translations.json", import.meta.url)),
  );
  assert.ok(Object.keys(catalog).length > 100);
  for (const [key, row] of Object.entries(catalog))
    for (const locale of ["pt", "en", "es", "it", "fr", "pl"])
      assert.ok(row[locale]?.trim(), `${key}: ${locale}`);
  const { parseLanguage, translator } = load("lib/i18n.ts", {
    "./translations.json": catalog,
  });
  for (const locale of ["pt", "en", "es", "it", "fr", "pl"]) {
    assert.equal(parseLanguage(locale), locale);
    assert.ok(translator(locale)("Imóveis disponíveis"));
    assert.equal(
      translator(locale)("Original property title"),
      "Original property title",
    );
  }
  assert.equal(parseLanguage("de"), "pt");
});
test("paid photo analysis cannot run by default", async () => {
  delete process.env.ENABLE_PAID_PHOTO_ANALYSIS;
  const { POST } = load("app/api/admin/imoveis/[id]/ordenar-fotos/route.ts");
  const response = await POST({}, { params: Promise.resolve({ id: "abc" }) });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /desativada/);
});
test("invalid URL dates, nonfinite prices and repeated filters are ignored", () => {
  const { parsePropertyFilters } = load("lib/filters.ts");
  for (const params of [
    { maxPrice: "Infinity", availableFrom: "2026-02-30" },
    { maxPrice: "-1", availableFrom: "not-a-date" },
    { maxPrice: ["100", "200"], type: ["Flat", "Room"] },
  ]) {
    const parsed = parsePropertyFilters(params);
    assert.equal(parsed.maxPrice, undefined);
    assert.equal(parsed.availableFrom, undefined);
  }
  const good = parsePropertyFilters({
    type: "Flat",
    region: "West",
    occupancy: "couple",
    maxPrice: "1200",
    priceFrequency: "month",
    availableFrom: "2026-12-01",
  });
  assert.equal(good.maxPrice, 1200);
  assert.equal(good.priceFrequency, "month");
  assert.equal(good.availableFrom, "2026-12-01");
});
test("language endpoint enforces same host, valid locale, and secure cookie settings", async () => {
  const { POST } = load("app/api/language/route.ts", {
    "@/lib/i18n": { languages: ["pt", "en", "es", "it", "fr", "pl"] },
  });
  const request = (origin, language) => ({
    headers: new Headers({
      host: "example.com",
      ...(origin ? { origin } : {}),
    }),
    json: async () => ({ language }),
  });
  for (const origin of ["https://evil.example", "not-a-url", null])
    assert.equal((await POST(request(origin, "en"))).status, 403);
  assert.equal((await POST(request("https://example.com", "de"))).status, 400);
  const response = await POST(request("https://example.com", "fr"));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /rooms-language=fr/);
  assert.match(response.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(response.headers.get("set-cookie"), /SameSite=lax/i);
});
test("property cards render translated controls but preserve original database copy in all six languages", async () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const catalog = JSON.parse(
    fs.readFileSync(new URL("../lib/translations.json", import.meta.url)),
  );
  const { translator } = load("lib/i18n.ts", {
    "./translations.json": catalog,
  });
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "447700900123";
  for (const language of ["pt", "en", "es", "it", "fr", "pl"]) {
    const t = translator(language);
    const { default: WhatsApp } = load("components/WhatsAppButton.tsx", {
      "./LanguageProvider": { useTranslation: () => t },
      "@/lib/format": format,
      "@/lib/supabase": { supabase: {} },
    });
    const { default: Card } = load("components/PropertyCard.tsx", {
      "@/lib/i18n-server": { getTranslator: async () => t },
      "next/image": ({ fill, sizes, ...props }) =>
        React.createElement("img", props),
      "next/link": ({ children, ...props }) =>
        React.createElement("a", props, children),
      "./Badge": ({ children }) => React.createElement("span", null, children),
      "./WhatsAppButton": WhatsApp,
      "@/lib/format": format,
      "@/components/ArrowIcon": () =>
        React.createElement("svg", { "aria-hidden": true }),
    });
    const html = renderToStaticMarkup(
      await Card({
        property: {
          id: "fixture-never-published",
          title: "Título original do banco",
          type: "Double Room",
          region: "West",
          postcode: "W1",
          price: 250,
          price_frequency: "week",
          photos: [],
          featured: true,
          bedrooms: 1,
          bathrooms: 1,
          available_from: "2026-12-01",
          occupancy: "couple",
        },
      }),
    );
    assert.ok(html.includes("Título original do banco"));
    assert.ok(html.includes(t("Foto a confirmar")));
    assert.ok(html.includes(t("Casal")));
    assert.ok(html.includes("/" + t("semana")));
    assert.ok(html.includes("wa.me/447700900123"));
    assert.ok(html.includes("fixture-never-published"));
    assert.equal(
      (html.match(/<a\s/g) || []).length,
      (html.match(/<\/a>/g) || []).length,
    );
  }
});
test("Netlify blocks all non-main deployments while allowing main", () => {
  const { spawnSync } = require("node:child_process");
  const script = new URL("../scripts/netlify-ignore.cjs", import.meta.url)
    .pathname;
  for (const [branch, status] of [
    ["codex/issue-1-lancamento", 0],
    ["painel-admin", 0],
    ["feature/new-layout", 0],
    ["main", 1],
  ])
    assert.equal(
      spawnSync(process.execPath, [script], {
        env: { ...process.env, BRANCH: branch },
      }).status,
      status,
    );
});

test("Polish outreach keeps the original property reference and title", () => {
  const catalog = JSON.parse(
    fs.readFileSync(new URL("../lib/translations.json", import.meta.url)),
  );
  const { translator } = load("lib/i18n.ts", {
    "./translations.json": catalog,
  });
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "447700900123";
  const url = new URL(
    format.whatsappLink("property-123", "Original title $&", translator("pl")),
  );
  assert.ok(url.searchParams.get("text").startsWith("Dzień dobry"));
  assert.ok(
    url.searchParams.get("text").includes("property-123 (Original title $&)"),
  );
});


test("permanent deletion is gated by two confirmations, super_admin and archival", () => {
  const button = fs.readFileSync(
    new URL("../components/admin/PermanentDeleteButton.tsx", import.meta.url), "utf8");
  const api = fs.readFileSync(
    new URL("../app/api/admin/imoveis/[id]/excluir-permanentemente/route.ts", import.meta.url), "utf8");
  const gate = fs.readFileSync(
    new URL("../lib/server/permanent-deletion.ts", import.meta.url), "utf8");
  const migration = fs.readFileSync(
    new URL("../supabase/migrations/007_permanent_delete_archived_property.sql", import.meta.url), "utf8");
  const quick = fs.readFileSync(
    new URL("../components/admin/PropertyQuickActions.tsx", import.meta.url), "utf8");

  // UI must demand two separate, explicit user actions.
  assert.match(button, /window\.confirm\(/);
  assert.match(button, /window\.prompt\(/);
  assert.match(button, /typed !== property\.id/);
  assert.match(button, /property\.status !== 'archived'/);
  assert.match(button, /!property\.hidden/);

  // UI role is convenience only; the server and SQL function both enforce it.
  assert.match(quick, /canDeletePermanently/);
  assert.match(gate, /member\?\.role !== 'super_admin'/);
  assert.match(api, /authorizePermanentDeletion\(request\)/);
  assert.match(api, /reference !== id/);
  assert.match(api, /phrase !== CONFIRM_PHRASE/);
  assert.match(api, /property\.status !== 'archived'/);
  assert.match(api, /preflightPropertyPhotos\(service, id, url\)/);

  // Backend delete must be transactional, with pending photo cleanup persisted.
  assert.match(migration, /security definer/);
  assert.match(migration, /role = 'super_admin'/);
  assert.match(migration, /p_confirmed_reference is distinct from p_property_id/);
  assert.match(migration, /where id = p_property_id\s+for update/i);
  assert.match(migration, /delete from public\.property_photos/);
  assert.match(migration, /delete from public\.properties/);
  assert.match(migration, /property_permanent_deletion_jobs/);
  assert.match(migration, /revoke all on function/);

  // Only server code can use the service key; never export it to the frontend.
  assert.match(gate, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(button + quick, /SERVICE_ROLE_KEY/);
});


test("location search shows exact area when available, otherwise nearby real inventory", () => {
  const api = load("lib/nearby.ts");
  const origin = { latitude: 51.427, longitude: -0.167 };
  const base = (id, station, postcode) => ({
    id, type: "Single Room", postcode, nearest_station: station,
    title: "Room " + id, region: null, photos: [],
  });
  const exact = base("exact", "Tooting Broadway Underground Station", "SW17 0AA");
  const close = base("close", "Colliers Wood", "SW19 2AA");
  const moderate = base("moderate", "Tooting Bec", "SW17 8AA");
  const far = base("far", "Wembley", "HA9 0AA");
  const locations = new Map([
    ["SW170AA", { latitude: 51.428, longitude: -0.167 }],
    ["SW192AA", { latitude: 51.429, longitude: -0.16 }],
    ["SW178AA", { latitude: 51.438, longitude: -0.162 }],
    ["HA90AA", { latitude: 51.557, longitude: -0.28 }],
  ]);

  const first = api.selectAreaAlternatives(
    [far, moderate, exact, close], "Tooting Broadway", origin, locations, 10);
  assert.equal(first.kind, "exact");
  assert.deepEqual(Array.from(first.entries, entry => entry.property.id), ["exact"]);

  const second = api.selectAreaAlternatives(
    [far, moderate, close], "Tooting Broadway", origin, locations, 10);
  assert.equal(second.kind, "nearby");
  assert.ok(second.radiusKm <= 3);
  assert.deepEqual(Array.from(second.entries, entry => entry.property.id),
    ["close", "moderate"]);
  assert.ok(second.entries[0].distanceKm < second.entries[1].distanceKm);

  const textFallback = api.selectAreaAlternatives(
    [far, moderate, close], "Colliers Wood", null, new Map(), 10);
  assert.equal(textFallback.kind, "exact");
  assert.equal(textFallback.entries[0].property.id, "close");

  const missing = api.selectAreaAlternatives(
    [far, moderate, close], "Tooting Broadway", null, new Map(), 10);
  assert.equal(missing.kind, "unresolved");
  assert.equal(missing.entries.length, 0);

  const empty = api.selectAreaAlternatives([], "Tooting Broadway", origin, locations, 10);
  assert.equal(empty.kind, "empty");
  assert.equal(empty.entries.length, 0);
});

test("search links preserve type/budget and Google Maps opens public transit", () => {
  const page = fs.readFileSync(new URL("../app/imoveis/page.tsx", import.meta.url), "utf8");
  const maps = fs.readFileSync(new URL("../components/NearbyPropertyGrid.tsx", import.meta.url), "utf8");
  const search = fs.readFileSync(new URL("../components/QuickSearchForm.tsx", import.meta.url), "utf8");
  assert.match(search, /name="near"/);
  assert.match(page, /selectAreaAlternatives/);
  assert.match(page, /region: undefined/);
  assert.match(page, /getProperties\(/);
  assert.match(maps, /travelmode: 'transit'/);
  assert.match(maps, /www\.google\.com\/maps\/dir/);
  assert.doesNotMatch(page + maps, /service_role/i);
});


test("home banner never promotes test property photos automatically", () => {
  const home = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(home, /available\.find\(\(p\)\s*=>\s*p\.photos\.length/);
  assert.doesNotMatch(home, /src=\{cover\}/);
  assert.match(home, /src="\/brand\/andre-mendes-icon\.svg"/);
  assert.match(home, /<PropertyGrid properties=\{available\}/);
});

test("admin can unlink an individual photo without silently destroying Storage media", () => {
  const editor = fs.readFileSync(
    new URL("../components/admin/PropertyPhotosEditor.tsx", import.meta.url), "utf8");
  assert.match(editor, /Retirar foto do anúncio/);
  assert.match(editor, /removePhotoFromListing/);
  assert.match(editor, /window\.confirm\(/);
  assert.match(editor, /'super_admin', 'manager'/);
  assert.match(editor, /\.from\('property_photos'\)/);
  assert.match(editor, /\.delete\(\)/);
  assert.match(editor, /\.eq\('property_id', propertyId\)/);
  assert.match(editor, /\.eq\('id', photoId\)/);
  assert.doesNotMatch(editor, /\.storage[\s\S]*?\.remove\(/);
});


test("gallery never returns to a tagged room after showing another room", () => {
  const input = [
    { id: "bed1", room_group: "Quarto 1" },
    { id: "kitchen1", room_group: "Cozinha" },
    { id: "bath1", room_group: "Banheiro 1" },
    { id: "bed2", room_group: "Quarto 1" },
    { id: "bath2", room_group: "Banheiro 1" },
    { id: "kitchen2", room_group: "Cozinha" },
    { id: "bed3", room_group: "Quarto 1" },
  ];
  const ids = photos.preserveCoverOrder(input, input.map(p => p.id));
  assert.deepEqual(Array.from(ids), [
    "bed1", "bed2", "bed3",
    "kitchen1", "kitchen2",
    "bath1", "bath2",
  ]);
  assert.equal(new Set(ids).size, input.length);
  const groups = new Map(input.map(p => [p.id, p.room_group]));
  const encountered = new Set();
  let previous = "";
  for (const id of ids) {
    const current = groups.get(id);
    if (current !== previous) {
      assert.equal(encountered.has(current), false, "environment repeated: " + current);
      encountered.add(current);
      previous = current;
    }
  }
});

test("gallery groups normalized labels, leaves untagged images to review", () => {
  const input = [
    { id: "a", room_group: " QUARTO 1 " },
    { id: "b", room_group: " Banheiro 1 " },
    { id: "c", room_group: "quarto 1" },
    { id: "d", room_group: null },
  ];
  assert.deepEqual(Array.from(photos.preserveCoverOrder(input, ["b", "c", "a", "d"])),
    ["a", "c", "b", "d"]);
  assert.equal(photos.roomGroupSummary(input).untagged, 1);
  assert.equal(photos.roomGroupSummary(input).groups, 2);
});

test("admin gallery requires all room labels for guaranteed no-repeat sorting", () => {
  const editor = fs.readFileSync(new URL("../components/admin/PropertyPhotosEditor.tsx", import.meta.url), "utf8");
  assert.match(editor, /Organizar ambientes sem repetição/);
  assert.match(editor, /roomGroupSummary\(latest\.data\)/);
  assert.match(editor, /if \(summary\.untagged\)/);
  assert.match(editor, /preserveCoverOrder\(latest\.data/);
  assert.match(editor, /Aplicar ambiente às selecionadas/);
  assert.match(editor, /supportsGroups/);
});
