/**
 * Updates the address bar's query string without reloading (Next.js keeps its router in step).
 * Commas stay as commas (?ids=bass,bass-ii), so shared links stay readable; URLSearchParams
 * reads them back either way.
 */
export function replaceQuery(params: URLSearchParams) {
  const query = params.toString().replace(/%2C/gi, ",");
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
}
