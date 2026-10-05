/**
 * Asserts a locale actually serves its own translated copy, and that the two
 * locales do not bleed into each other.
 *
 *   node scripts/check-locale-content.mjs en   # expects the English page
 *   node scripts/check-locale-content.mjs it   # expects /it in Italian
 *
 * Run against a live server (`BASE`, default :3000). Checks the landing page,
 * plus one auth route each, for the presence of this locale's strings and the
 * absence of a distinctive marker unique to the other locale.
 */
const BASE = (process.env.BASE ?? "http://localhost:3000").replace(/\/$/, "");

const locale = process.argv[2] === "it" ? "it" : "en";

let pass = 0;
let fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}${detail ? ` - ${detail}` : ""}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ""}`);
  }
};

/** Strings that must appear, per locale, per route. */
const EXPECT = {
  en: {
    "/": [
      "Analytics that respects",
      "Trusted by 4,200+",
      "Zero cookies. Zero PII.",
      "Cheaper than your coffee",
      "Questions, answered",
      "Don’t take our word for it",
    ],
    "/login": ["Welcome back", "Sign in", "No credit card"],
    "/signup": ["Start tracking free", "Create account", "Already have an account?"],
  },
  it: {
    "/it": [
      "Analytics che rispetta",
      "4.200 sviluppatori",
      "Zero cookie. Zero PII.",
      "Costa meno del tuo caffè",
      "Domande, con risposta",
      "Non fidarti delle nostre parole",
    ],
    "/it/login": ["Bentornato", "Accedi", "Nessuna carta di credito"],
    "/it/signup": [
      "Inizia a tracciare gratis",
      "Crea account",
      "Hai già un account?",
    ],
  },
};

/** A distinctive string from the *other* locale; must not appear here. */
const FOREIGN = {
  en: ["Analytics che rispetta", "Bentornato", "Costa meno del tuo caffè"],
  it: ["Analytics that respects", "Welcome back", "Cheaper than your coffee"],
};

async function main() {
  console.log(`\n=== locale content check: ${locale} ===\n  base ${BASE}\n`);

  for (const [path, needles] of Object.entries(EXPECT[locale])) {
    const url = `${BASE}${path}`;
    let html = "";
    try {
      const res = await fetch(url);
      html = await res.text();
      check(`${path} responds 200`, res.ok, `status ${res.status}`);
    } catch (error) {
      check(`${path} is reachable`, false, String(error));
      continue;
    }

    for (const needle of needles) {
      check(`${path} contains "${needle}"`, html.includes(needle));
    }

    const leaks = FOREIGN[locale].filter((needle) => html.includes(needle));
    check(`${path} has no ${locale === "en" ? "Italian" : "English"} leakage`, leaks.length === 0, leaks.join(" | "));

    const lang = locale === "en" ? "en" : "it";
    check(`${path} declares <html lang="${lang}">`, html.includes(`<html lang="${lang}"`));
    check(`${path} marks the active locale as current`, html.includes(`aria-current="true"`));
  }

  console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
  // Set exitCode instead of calling process.exit(): a hard exit tears down
  // in-flight libuv handles, which trips an assertion on Windows and makes the
  // gate look like it crashed even when every check passed.
  process.exitCode = fail > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
