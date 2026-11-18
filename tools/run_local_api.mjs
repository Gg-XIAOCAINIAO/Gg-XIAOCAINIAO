// 本地以 Node HTTP 服务运行 Cloudflare Pages Functions 的 /api 处理逻辑，
// 数据库用 node:sqlite（见 d1-shim.mjs）代替 D1，便于在无 Cloudflare 账号时回归测试。
import http from "node:http";
import { pathToFileURL } from "node:url";
import { createD1 } from "./d1-shim.mjs";
import { handle } from "../functions/_app.js";

export function startApi({ port = 0, dbPath }) {
  const DB = createD1(dbPath);
  const server = http.createServer(async (req, res) => {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      const actualPort = server.address().port;
      const url = `http://127.0.0.1:${actualPort}${req.url}`;
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) for (const item of value) headers.append(key, item);
        else headers.set(key, value);
      }
      const init = { method: req.method, headers };
      if (req.method !== "GET" && req.method !== "HEAD" && body.length > 0) {
        init.body = body;
      }
      const response = await handle(new Request(url, init), { DB });
      res.statusCode = response.status;
      for (const [key, value] of response.headers.entries()) {
        res.setHeader(key, value);
      }
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: `local harness error: ${error && error.message}` }));
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      resolve({ server, port: server.address().port, DB });
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const port = Number(args[args.indexOf("--port") + 1] || 8787);
  const dbPath = args[args.indexOf("--db") + 1];
  if (!dbPath) {
    console.error("usage: node tools/run_local_api.mjs --port 8787 --db .tmp/api.db");
    process.exit(1);
  }
  const { port: actual } = await startApi({ port, dbPath });
  console.log(`local api listening on http://127.0.0.1:${actual} (db: ${dbPath})`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
