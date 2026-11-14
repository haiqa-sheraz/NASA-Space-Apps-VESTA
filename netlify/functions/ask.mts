/**
 * Ask AI (Netlify Function, newer format): POST /api/ask streams an answer from our NASA sources.
 * Needs OPENROUTER_API_KEY in the Netlify environment settings.
 */
import { askFunction } from "../../src/lib/ask/server/http";

export default askFunction;

export const config = { path: "/api/ask" };
