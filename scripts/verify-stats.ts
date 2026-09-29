import { getStats, getRealtime, buildBuckets, referrerSource } from "../lib/stats";

async function main() {
  const site = { siteId: "bm_acme_8f2k1" };

  console.log("buckets(24h):", buildBuckets("24h").slice(0, 3).map((b) => `${b.key} ${b.label}`).join(" | "));
  console.log("buckets(7d):", buildBuckets("7d").map((b) => b.key).join(" "));
  console.log("referrer:", referrerSource("https://t.co/xyz"), "/", referrerSource("https://x.com/a/b"), "/", referrerSource(""), "/", referrerSource("https://www.google.com/search?q=a"));

  const s = await getStats(site.siteId, "7d");
  console.log("\ntotals:", s.totals);
  console.log("change:", s.change);
  console.log("series len:", s.series.length, "sum visitors:", s.series.reduce((a, b) => a + b.visitors, 0));
  console.log("series sample:", s.series.slice(-3));
  console.log("\ntopPages:", s.topPages.slice(0, 3));
  console.log("\nreferrers:", s.referrers);
  console.log("\ndevices:", s.devices);
  console.log("browsers:", s.browsers);
  console.log("os:", s.operatingSystems);
  console.log("countries:", s.countries);
  console.log("\nrealtime:", await getRealtime(site.siteId));

  for (const r of ["24h", "30d", "90d"] as const) {
    const x = await getStats(site.siteId, r);
    console.log(`\n${r}: visitors=${x.totals.visitors} pageviews=${x.totals.pageviews} seriesLen=${x.series.length} change=${x.change.visitors.toFixed(1)}%`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
