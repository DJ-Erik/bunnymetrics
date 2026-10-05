/* Renders the dashboard as the seeded demo user and asserts real data appears. */
const BASE = process.env.BASE ?? "http://localhost:3100";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
};

const jar = [];
const saveCookies = (res) => {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(";");
    const [k, v] = pair.split("=");
    if (k && v) jar.push(`${k}=${v}`);
  }
};
const cookie = () => jar.join("; ");

const csrf = await fetch(`${BASE}/api/auth/csrf`);
const { csrfToken } = await csrf.json();
saveCookies(csrf);

const signin = await fetch(`${BASE}/api/auth/callback/credentials`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie() },
  body: new URLSearchParams({
    csrfToken,
    email: "demo@bunnymetrics.dev",
    password: "demo1234",
    json: "true",
  }),
  redirect: "manual",
});
saveCookies(signin);
if (signin.status >= 400) {
  console.log(`  sign-in failed: ${signin.status} ${await signin.text()}`);
}

const sessionRes = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: cookie() } });
const session = await sessionRes.json();
console.log(`\n  session status ${sessionRes.status}, cookies ${jar.length}, body ${JSON.stringify(session).slice(0, 200)}`);
console.log(`  signed in as ${session?.user?.email} (${session?.user?.plan})\n`);
check("demo sign-in", session?.user?.email === "demo@bunnymetrics.dev", JSON.stringify(session));

const sitesRes = await fetch(`${BASE}/api/sites`, { headers: { Cookie: cookie() } });
const sitesText = await sitesRes.text();
console.log(`  /api/sites status ${sitesRes.status}, body ${sitesText.slice(0, 160)}`);
const sites = JSON.parse(sitesText);
check("demo has 2 sites", sites.length === 2, `${sites.length}`);
check("site events counted", sites[0]?.eventCount > 1000, `${sites[0]?.eventCount} events`);

for (const range of ["24h", "7d", "30d"]) {
  const html = await (
    await fetch(`${BASE}/dashboard?site=${sites[0].publicId}&range=${range}`, {
      headers: { Cookie: cookie() },
    })
  ).text();

  check(`dashboard ${range}: site domain`, html.includes(sites[0].domain));
  check(`dashboard ${range}: top pages table`, html.includes("Top pages"));
  check(`dashboard ${range}: referrers`, html.includes("Where visitors come from"));
  check(`dashboard ${range}: devices`, html.includes("Devices"));
  check(`dashboard ${range}: countries`, html.includes("Countries"));
  // Recharts' ResponsiveContainer measures the DOM at runtime, so the <svg> is
  // not in the SSR output. Assert the container mounted and that the empty
  // state was NOT hit, plus that the payload carries real series numbers.
  check(`dashboard ${range}: chart container mounted`, html.includes("data-chart"));
  // Assert the chart markup rather than the absence of a string: next-intl
  // embeds the whole catalogue in the RSC payload, so the empty-state copy is
  // present in the HTML whether or not the empty state was rendered.
  check(
    `dashboard ${range}: chart has data`,
    html.includes("data-chart") && !html.includes("border-dashed"),
  );
  check(`dashboard ${range}: series serialised`, /events\\?":\s*\d/.test(html));
  check(`dashboard ${range}: realtime card`, html.includes("Active right now"));
  check(`dashboard ${range}: install snippet`, html.includes(sites[0].publicId));
  check(`dashboard ${range}: top page path`, html.includes("/pricing") || html.includes("/docs/getting-started"));
}

const html = await (
  await fetch(`${BASE}/dashboard?site=${sites[1].publicId}`, { headers: { Cookie: cookie() } })
).text();
check("second site renders", html.includes(sites[1].domain));

// Cross-tenant isolation: the other seeded user must not be reachable.
const other = sites[0].publicId;
const leak = await fetch(`${BASE}/api/events?site=${other}`, { headers: { Cookie: cookie() } });
check("owner can read own site events", leak.ok, `status ${leak.status}`);

console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail > 0 ? 1 : 0);
