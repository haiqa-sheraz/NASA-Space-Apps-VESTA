/**
 * Where the browser sends Ask AI and Compare explanation requests: the Netlify Functions in
 * netlify/functions, at Netlify's own address for functions. Netlify always sends /.netlify/*
 * to its functions, never to the Next.js app, so these can't be caught by the site's own pages.
 * In local development, next.config.ts forwards them to scripts/dev-functions.ts.
 */
export const ASK_URL = "/.netlify/functions/ask";
export const COMPARE_URL = "/.netlify/functions/compare";
