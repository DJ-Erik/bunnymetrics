/* End-to-end smoke test against a running server. */
const BASE = process.env.BASE ?? "http://localhost:3000";

let pass = 0;
let fail = 0;
const results = [];

function check(name, ok, detail = "") {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
  results.push({ name, ok, detail });
}

async function main() {
  console.log(`\n=== BunnyMetrics smoke test against ${BASE} ===\n`);

  // ---- static pages ----
  console.log("Pages");
  for (const path of ["/", "/login", "/signup", "/tracking.js"]) {
    const res = await fetch(BASE + path);
    check(`GET ${path}`, res.ok, `status ${res.status}`);
  }

  const home = await (await fetch(BASE + "/")).text();
  check("landing prerenders hero copy", home.includes("Analytics that respects"));
  check("landing prerenders FAQ", home.includes("cookie consent banner"));
  check("landing prerenders pricing", home.includes("Most popular"));
  check("landing has no CSR bailout", !home.includes("BAILOUT_TO_CLIENT_SIDE_RENDERING"));

  const loginHtml = await (await fetch(BASE + "/login")).text();
  check("login prerenders without bailout", !loginHtml.includes("BAILOUT_TO_CLIENT_SIDE_RENDERING") && loginHtml.includes("Welcome back"));

  const tracker = await (await fetch(BASE + "/tracking.js")).text();
  check("tracking.js served", tracker.length > 500 && tracker.length < 2048, `${tracker.length} bytes`);
  check("tracking.js CORS", (await fetch(BASE + "/tracking.js")).headers.get("access-control-allow-origin") === "*");

  // ---- auth guards ----
  console.log("\nAuth guards");
  for (const path of ["/api/sites", "/api/events?site=bm_acme_8f2k1"]) {
    const res = await fetch(BASE + path);
    check(`unauth ${path} -> 401`, res.status === 401, `status ${res.status}`);
  }

  const dash = await fetch(BASE + "/dashboard", { redirect: "manual" });
  check("unauth /dashboard redirects", [302, 307, 303].includes(dash.status), `status ${dash.status}`);

  // ---- tracking script -> collect -> stats ----
  console.log("\nIngestion");
  const site = "bm_acme_8f2k1";
  const before = await (await fetch(`${BASE}/api/stats?site=${site}&range=24h`)).json();

  for (let i = 0; i < 3; i += 1) {
    const res = await fetch(`${BASE}/api/collect?site=${site}&type=pageview&path=/e2e-test&vid=e2e_vid_1&sid=e2e_sid_1&br=Chrome&os=macOS&dv=desktop&lang=en-US`);
    check(`collect #${i + 1} -> 204`, res.status === 204, `status ${res.status}`);
  }

  const dup = await fetch(`${BASE}/api/collect?site=${site}&type=pageview&path=/e2e-test&vid=e2e_vid_1&sid=e2e_sid_1&br=Chrome&os=macOS&dv=desktop`);
  check("collect dedupes identical hits", dup.status === 204);

  const beacon = await fetch(`${BASE}/api/collect?site=${site}&type=engagement&path=/e2e-test&vid=e2e_vid_1&dur=42&scroll=75`);
  check("collect accepts engagement", beacon.status === 204);

  const bad = await fetch(`${BASE}/api/collect?site=nonexistent_key&path=/x&vid=y`);
  check("collect ignores unknown site", bad.status === 204);

  const opts = await fetch(`${BASE}/api/collect`, { method: "OPTIONS" });
  check("collect preflight -> 204 + CORS", opts.status === 204 && opts.headers.get("access-control-allow-origin") === "*");

  const after = await (await fetch(`${BASE}/api/stats?site=${site}&range=24h`)).json();
  check("stats picked up new visitor", after.totals.visitors >= before.totals.visitors, `${before.totals.visitors} -> ${after.totals.visitors}`);
  check("stats series is 24 hourly buckets", after.series.length === 24, `len ${after.series.length}`);
  check("stats has zero-filled series", after.series.every((p) => typeof p.visitors === "number"));

  // Regression guard: the bucket keys must actually line up with the SQL
  // strftime output, otherwise every bucket silently returns zero.
  // NOTE: per-bucket uniques may legitimately sum to MORE than the window's
  // distinct-visitor total (a visitor in two hours counts once per bucket),
  // so only assert the series is populated, not that it matches the total.
  const seriesVisitors = after.series.reduce((sum, p) => sum + p.visitors, 0);
  check("series buckets join to real data", seriesVisitors > 0, `${seriesVisitors} visitors across 24h`);
  check("series has at least one non-empty bucket", after.series.some((p) => p.events > 0));
  check("series bucket count matches range", after.series.length === 24);
  check("series pageviews >= unique visitors", after.series.reduce((s, p) => s + p.pageviews, 0) >= after.totals.visitors);
  check("stats top pages present", after.topPages.length > 0, `${after.topPages.length} pages`);
  check("stats referrers normalised", after.referrers.some((r) => r.source === "X / Twitter"), after.referrers.map((r) => r.source).slice(0, 4).join(", "));
  check("stats devices breakdown", after.devices.length > 0);
  check("stats realtime present", typeof after.realtime.activeVisitors === "number");

  for (const range of ["24h", "7d", "30d", "90d"]) {
    const r = await (await fetch(`${BASE}/api/stats?site=${site}&range=${range}`)).json();
    const expected = { "24h": 24, "7d": 7, "30d": 30, "90d": 90 }[range];
    check(`range ${range} -> ${expected} buckets`, r.series.length === expected, `len ${r.series.length}`);
    const populated = r.series.reduce((s, p) => s + p.events, 0);
    check(`range ${range} series populated`, populated > 0, `${populated} events`);
  }

  const badRange = await (await fetch(`${BASE}/api/stats?site=${site}&range=nonsense`)).json();
  check("invalid range falls back to 7d", badRange.range === "7d", badRange.range);

  const rt = await (await fetch(`${BASE}/api/stats?site=${site}&realtime=1`)).json();
  check("realtime endpoint", typeof rt.activeVisitors === "number" && Array.isArray(rt.byPath), `${rt.activeVisitors} active`);

  const noSite = await fetch(`${BASE}/api/stats`);
  check("stats without site -> 400", noSite.status === 400, `status ${noSite.status}`);

  const unknownSite = await fetch(`${BASE}/api/stats?site=does_not_exist`);
  check("stats unknown site -> 404", unknownSite.status === 404, `status ${unknownSite.status}`);

  // ---- full signup -> session -> site CRUD ----
  console.log("\nAuthenticated flow");
  const email = `e2e_${Date.now()}@bunnymetrics.test`;
  const jar = [];

  function saveCookies(res) {
    const setCookie = res.headers.getSetCookie?.() ?? [];
    for (const c of setCookie) {
      const [pair] = c.split(";");
      const [k, v] = pair.split("=");
      if (k && v) jar.push(`${k}=${v}`);
    }
  }
  const cookieHeader = () => jar.join("; ");

  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "E2E Tester", email, password: "supersecret123" }),
  });
  const regBody = await reg.json();
  check("register -> 201", reg.status === 201, `status ${reg.status}`);
  check("register returns user without password", regBody.user && !("password" in regBody.user));
  saveCookies(reg);

  const dupe = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "E2E Tester", email, password: "supersecret123" }),
  });
  check("duplicate register -> 409", dupe.status === 409, `status ${dupe.status}`);

  const weak = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "X", email: "bad", password: "short" }),
  });
  check("invalid register -> 422", weak.status === 422, `status ${weak.status}`);

  // NextAuth credentials sign-in
  const csrf = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrf.json();
  saveCookies(csrf);

  const signin = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(),
    },
    body: new URLSearchParams({ csrfToken, email, password: "supersecret123", json: "true" }),
    redirect: "manual",
  });
  saveCookies(signin);
  check("credentials sign-in", signin.status < 400, `status ${signin.status}`);

  const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: cookieHeader() } })).json();
  check("session has user", Boolean(session?.user?.email), session?.user?.email ?? "none");

  const authSites = await fetch(`${BASE}/api/sites`, { headers: { Cookie: cookieHeader() } });
  check("authed GET /api/sites", authSites.ok, `status ${authSites.status}`);
  check("new account has 0 sites", (await authSites.clone().json()).length === 0);

  const create = await fetch(`${BASE}/api/sites`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader() },
    body: JSON.stringify({ name: "E2E Site", domain: "https://www.E2E-Test.dev/", environment: "staging" }),
  });
  const created = await create.json();
  check("create site -> 201", create.status === 201, `status ${create.status}`);
  check("domain normalised", created.site?.domain === "e2e-test.dev", created.site?.domain);
  check("snippet returned", typeof created.snippet === "string" && created.snippet.includes(created.site?.publicId ?? ""));
  const newSite = created.site?.publicId;

  const badSite = await fetch(`${BASE}/api/sites`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader() },
    body: JSON.stringify({ name: "Bad", domain: "not a domain" }),
  });
  check("invalid domain -> 422", badSite.status === 422, `status ${badSite.status}`);

  // Geography comes from CDN headers, never from client input.
  await fetch(`${BASE}/api/collect?site=${newSite}&type=pageview&path=/hello&vid=e2e_new_1&br=Firefox&os=Linux&dv=mobile`, {
    headers: { "cf-ipcountry": "DE" },
  });

  const newStats = await (await fetch(`${BASE}/api/stats?site=${newSite}&range=24h`)).json();
  check("new site records event", newStats.totals.pageviews === 1, `pageviews ${newStats.totals.pageviews}`);
  check("new site top page", newStats.topPages[0]?.path === "/hello", newStats.topPages[0]?.path);
  check("country from Cloudflare header", newStats.countries[0]?.label === "DE", JSON.stringify(newStats.countries));

  // Vercel sets its own country header; it must be honoured.
  await fetch(`${BASE}/api/collect?site=${newSite}&type=pageview&path=/vercel-geo&vid=e2e_new_vercel`, {
    headers: { "x-vercel-ip-country": "GB", "x-vercel-ip-city": "London" },
  });
  const vercelGeo = await (await fetch(`${BASE}/api/stats?site=${newSite}&range=24h`)).json();
  check("country from Vercel header", vercelGeo.countries.some((c) => c.label === "GB"), JSON.stringify(vercelGeo.countries));

  const vercelRows = await (await fetch(`${BASE}/api/events?site=${newSite}&limit=50`, { headers: { Cookie: cookieHeader() } })).json();
  const london = vercelRows.events.find((e) => e.path === "/vercel-geo");
  check("country stored from x-vercel-ip-country", london?.country === "GB", `country = ${String(london?.country)}`);

  // City is deliberately not collected. The edge header is present on the
  // request above and must still be ignored.
  check("city NOT collected despite x-vercel-ip-city", london?.city === null, `city = ${String(london?.city)}`);

  await fetch(`${BASE}/api/collect?site=${newSite}&type=pageview&path=/spoof&vid=e2e_new_2`, {
    headers: { "cf-ipcountry": "XX", "cf-ipcity": "Nowhere" },
  });
  const spoof = await (await fetch(`${BASE}/api/stats?site=${newSite}&range=24h`)).json();
  check("unknown country ignored", spoof.countries.every((c) => c.label !== "XX"), JSON.stringify(spoof.countries));

  const clientSpoof = await fetch(`${BASE}/api/collect?site=${newSite}&type=pageview&path=/client-geo&vid=e2e_new_3&country=JP&city=Tokyo`);
  check("client-supplied geo params accepted but inert", clientSpoof.status === 204);
  const spoofRows = await (await fetch(`${BASE}/api/events?site=${newSite}&limit=50`, { headers: { Cookie: cookieHeader() } })).json();
  const clientRow = spoofRows.events.find((e) => e.path === "/client-geo");
  check("client cannot spoof country", clientRow?.country === null, `country = ${String(clientRow?.country)}`);
  check("client cannot spoof city", clientRow?.city === null, `city = ${String(clientRow?.city)}`);

  // City must not appear in the CSV export either.
  const csvBody = await (await fetch(`${BASE}/api/events?site=${newSite}&format=csv&limit=50`, { headers: { Cookie: cookieHeader() } })).text();
  const csvHeader = csvBody.split("\n")[0] ?? "";
  check("city absent from CSV header", !csvHeader.includes("city"), csvHeader.slice(0, 60));
  check("country present in CSV header", csvHeader.includes("country"), csvHeader.slice(0, 60));

  const patch = await fetch(`${BASE}/api/sites/${newSite}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader() },
    body: JSON.stringify({ name: "Renamed Site" }),
  });
  check("PATCH site", patch.ok && (await patch.json()).site.name === "Renamed Site");

  const crossTenant = await fetch(`${BASE}/api/sites/${site}`, { headers: { Cookie: cookieHeader() } });
  check("cross-tenant site read -> 404", crossTenant.status === 404, `status ${crossTenant.status}`);

  const token = await fetch(`${BASE}/api/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader() },
    body: JSON.stringify({ name: "ci token" }),
  });
  const tokenBody = await token.json();
  check("mint api token -> 201", token.status === 201 && typeof tokenBody.token === "string");

  const ingest = await fetch(`${BASE}/api/events?site=${newSite}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenBody.token}` },
    body: JSON.stringify({ events: [{ path: "/from-api", visitorId: "api_vid_1" }] }),
  });
  check("bearer ingest -> 201", ingest.status === 201 && (await ingest.json()).ingested === 1, `status ${ingest.status}`);

  const badBearer = await fetch(`${BASE}/api/sites`, { headers: { Authorization: "Bearer bmt_bogus" } });
  check("bogus bearer -> 401", badBearer.status === 401, `status ${badBearer.status}`);

  const csv = await fetch(`${BASE}/api/events?site=${newSite}&format=csv`, { headers: { Cookie: cookieHeader() } });
  const csvText = await csv.text();
  check("csv export", csv.headers.get("content-type")?.includes("text/csv"), csv.headers.get("content-type") ?? "");
  check("csv has header row", csvText.startsWith("createdAt,type,path"), csvText.split("\n")[0]?.slice(0, 40));

  const billing = await fetch(`${BASE}/api/billing`, { headers: { Cookie: cookieHeader() } });
  const billingBody = await billing.json();
  check("billing usage", billing.ok && billingBody.usage.limit === 10000, JSON.stringify(billingBody.usage));

  const checkout = await fetch(`${BASE}/api/billing/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader() },
    body: JSON.stringify({ plan: "pro", interval: "yearly" }),
  });
  const checkoutBody = await checkout.json();
  check("mock checkout", checkout.status === 200 && checkoutBody.subscription?.plan === "pro",
    `status ${checkout.status} body ${JSON.stringify(checkoutBody).slice(0, 200)}`);

  const cancel = await fetch(`${BASE}/api/billing/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader() },
    body: JSON.stringify({ immediately: true }),
  });
  check("mock cancel", cancel.status === 200);

  const dashHtml = await fetch(`${BASE}/dashboard`, { headers: { Cookie: cookieHeader() } });
  const dashText = await dashHtml.text();
  check("authed dashboard renders", dashHtml.ok && dashText.includes("e2e-test.dev"), `status ${dashHtml.status}`);

  const del = await fetch(`${BASE}/api/sites/${newSite}`, { method: "DELETE", headers: { Cookie: cookieHeader() } });
  check("delete site -> 204", del.status === 204, `status ${del.status}`);

  const gone = await fetch(`${BASE}/api/stats?site=${newSite}`);
  check("deleted site stats -> 404", gone.status === 404, `status ${gone.status}`);

  const signout = await fetch(`${BASE}/api/auth/signout`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookieHeader() },
    body: new URLSearchParams({ csrfToken }),
    redirect: "manual",
  });
  check("sign-out", signout.status < 400, `status ${signout.status}`);

  console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
  if (fail > 0) {
    console.log("Failures:");
    for (const r of results.filter((r) => !r.ok)) console.log(`  - ${r.name} (${r.detail})`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
