/**
 * Ask AI (Netlify Function, newer format): POST /.netlify/functions/ask streams an answer from our
 * NASA sources. It keeps Netlify's own address (see src/lib/ask/endpoints.ts), so the Next.js app
 * on the same site can never catch its requests.
 * Needs OPENROUTER_API_KEY in the Netlify environment settings.
 */
import { askFunction } from "../../src/lib/ask/server/http";

export default askFunction;
