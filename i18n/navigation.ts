import { createNavigation } from "next-intl/navigation";

import { routing } from "@/i18n";

/**
 * Locale-aware navigation helpers.
 *
 * `Link` prefixes the active locale automatically, so `/signup` becomes
 * `/it/signup` for an Italian visitor without any conditional code at the call
 * site. Imported from server code, so `getPathname` has no client cost.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
