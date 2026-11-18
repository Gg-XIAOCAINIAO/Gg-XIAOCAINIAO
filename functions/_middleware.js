// 全站鉴权中间件：静态资源、页面与 /api/* 都会经过这里。
import { ensureDb } from "./_db.js";
import {
  bytesToBase64Url,
  getCookie,
  getSessionUser,
  isAdminOnly,
  isPublicPath,
  SESSION_COOKIE,
} from "./_auth.js";

const CONFIG_ERROR_HTML = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>配置未完成</title>
<style>body{font-family:system-ui,-apple-system,"Microsoft YaHei",sans-serif;background:#F5F3F0;color:#3F3B37;
display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
.card{background:#FAF9F7;border:1px solid #DDD9D4;border-radius:16px;padding:32px 36px;max-width:520px;line-height:1.7}
h1{font-size:18px;margin:0 0 12px}code{background:#F5F3F0;padding:2px 6px;border-radius:6px}</style></head>
<body><div class="card"><h1>系统还没配置完成</h1>
<p>缺少 Cloudflare 环境变量 <code>APP_SECRET</code> 或 D1 绑定，请联系管理员在 Pages 项目的
Settings → Variables and Secrets 中补充后重新部署。</p></div></body></html>`;

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function configError(isApi) {
  if (isApi) return json(503, { error: "系统尚未完成鉴权配置" });
  return new Response(CONFIG_ERROR_HTML, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = decodeURIComponent(url.pathname);
  const isApi = path.startsWith("/api/");
  const method = request.method.toUpperCase();

  if (!env || !env.DB) return configError(isApi);
  if (!env.APP_SECRET) return configError(isApi);

  // 同源校验（防 CSRF）：带 Origin 的写请求必须与当前站点一致。
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const origin = request.headers.get("origin");
    if (origin) {
      let originHost = null;
      try {
        originHost = new URL(origin).host;
      } catch {
        originHost = null;
      }
      if (!originHost || originHost !== url.host) {
        return isApi ? json(403, { error: "请求来源不合法" }) : new Response("Forbidden", { status: 403 });
      }
    }
  }

  const sanitized = new Headers(request.headers);
  sanitized.delete("x-rental-user");
  sanitized.delete("x-rental-user-id");
  sanitized.delete("x-rental-user-username");
  sanitized.delete("x-rental-user-name");
  sanitized.delete("x-rental-user-role");

  if (isPublicPath(path)) {
    return context.next(new Request(request, { headers: sanitized }));
  }

  try {
    await ensureDb(env);
  } catch (error) {
    console.error("[middleware] db init failed", error);
    return configError(isApi);
  }

  const token = getCookie(request, SESSION_COOKIE);
  const user = token ? await getSessionUser(env.DB, token, env.APP_SECRET) : null;
  if (!user) {
    if (isApi) return json(401, { error: "请先登录" });
    const next = encodeURIComponent(url.pathname + url.search);
    return Response.redirect(new URL(`/login?next=${next}`, url).toString(), 302);
  }

  if (isAdminOnly(method, path) && user.role !== "admin") {
    if (isApi) return json(403, { error: "需要管理员权限" });
    return new Response("Forbidden", { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const identity = JSON.stringify({
    id: Number(user.id),
    username: user.username,
    display_name: user.display_name,
    role: user.role,
  });
  sanitized.set("x-rental-user", bytesToBase64Url(new TextEncoder().encode(identity)));

  return context.next(new Request(request, { headers: sanitized }));
}
