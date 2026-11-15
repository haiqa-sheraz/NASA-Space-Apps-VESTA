/**
 * Compare explanation (Netlify Function, newer format): POST /.netlify/functions/compare streams
 * what 2 or 3 studies share, how they differ and what it means for safety, citing NASA sources.
 * It keeps Netlify's own address (see src/lib/ask/endpoints.ts).
 * Needs OPENROUTER_API_KEY in the Netlify environment settings.
 */
import { compareFunction } from "../../src/lib/ask/server/http";

export default compareFunction;
