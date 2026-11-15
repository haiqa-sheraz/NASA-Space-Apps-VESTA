/**
 * Runs the Ask AI and Compare explanation functions locally on http://localhost:8888, the same
 * functions Netlify runs, at the same addresses (/.netlify/functions/ask and /compare). In
 * development, Next.js forwards those requests here (next.config.ts).
 *
 * Run from the project root:  bun scripts/dev-functions.ts   (or: bun run dev:ai for both servers)
 * Bun reads OPENROUTER_API_KEY from .env.
 */
import { createServer } from "node:http";
import { askFunction, compareFunction } from "../src/lib/ask/server/http";

const PORT = Number(process.env.FUNCTIONS_PORT ?? 8888);
const routes: Record<string, (req: Request, context?: { ip?: string }) => Promise<Response>> = {
  "/.netlify/functions/ask": askFunction,
  "/.netlify/functions/compare": compareFunction,
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    const fn = routes[url.pathname];
    if (!fn) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) if (typeof value === "string") headers.set(key, value);
    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const request = new Request(url, { method: req.method, headers, body: hasBody ? Buffer.concat(chunks) : undefined });
    const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.socket.remoteAddress || undefined;
    const response = await fn(request, { ip });

    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) {
      const reader = response.body.getReader();
      // The visitor pressed Stop or left: stop the answer too.
      res.on("close", () => void reader.cancel().catch(() => {}));
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch {
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json" });
    res.end();
  }
}).listen(PORT, () => {
  console.log(`Ask AI functions running on http://localhost:${PORT} (/.netlify/functions/ask and /compare).`);
  console.log(process.env.OPENROUTER_API_KEY ? "OpenRouter key found in the environment." : "No OPENROUTER_API_KEY: add it to .env, then restart.");
});
