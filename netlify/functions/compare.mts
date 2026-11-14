/**
 * Compare explanation (Netlify Function, newer format): POST /api/compare streams what 2 or 3
 * studies share, how they differ and what it means for safety, citing NASA sources.
 * Needs OPENROUTER_API_KEY in the Netlify environment settings.
 */
import { compareFunction } from "../../src/lib/ask/server/http";

export default compareFunction;

export const config = { path: "/api/compare" };
