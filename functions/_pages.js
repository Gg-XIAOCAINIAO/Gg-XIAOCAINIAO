// 登录 / 账号页共用的 HTML 外壳与样式（Functions 直接返回，不依赖静态资源，避免被鉴权拦截）。
export function htmlPage({ title, body, script = "", wide = false }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} · 回声科技</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
:root{--ink:#3F3B37;--muted:#8A8580;--sage:#A3A8A0;--clay:#C4A69B;--line:#DDD9D4;--paper:#F5F3F0;--card:#FAF9F7}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:var(--paper);color:var(--ink);
  font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;
  display:flex;align-items:center;justify-content:center;padding:24px}
.card{width:100%;max-width:${wide ? "860px" : "400px"};background:var(--card);border:1px solid var(--line);
  border-radius:18px;padding:32px 32px 28px;box-shadow:0 18px 50px rgba(63,59,55,.08)}
.brand{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:12px;letter-spacing:.14em;margin-bottom:22px}
.brand i{width:26px;height:26px;border-radius:50%;border:1px solid var(--line);display:inline-block;
  background:radial-gradient(circle at 35% 35%, #fff, var(--paper))}
h1{font-size:20px;font-weight:600;margin:0 0 6px;letter-spacing:.04em}
.sub{margin:0 0 22px;color:var(--muted);font-size:13px;line-height:1.6}
label{display:block;font-size:12px;letter-spacing:.08em;color:var(--muted);margin:14px 0 6px}
input,select{width:100%;height:40px;padding:0 12px;border:1px solid var(--line);border-radius:10px;
  background:#fff;color:var(--ink);font-size:14px;outline:none}
input:focus,select:focus{border-color:var(--sage);box-shadow:0 0 0 3px rgba(163,168,160,.18)}
button{height:40px;padding:0 18px;border-radius:10px;border:1px solid var(--ink);background:var(--ink);
  color:#FAF9F7;font-size:14px;letter-spacing:.06em;cursor:pointer}
button:hover{opacity:.9}
button:disabled{opacity:.5;cursor:not-allowed}
button.ghost{background:transparent;color:var(--ink);border-color:var(--line)}
button.danger{background:transparent;color:#9a4b3d;border-color:#d8b9b1}
.row{display:flex;gap:12px}
.row>*{flex:1}
.actions{display:flex;gap:10px;margin-top:22px;align-items:center}
.error{min-height:18px;margin-top:12px;color:#9a4b3d;font-size:13px}
.ok{min-height:18px;margin-top:12px;color:#4f6b52;font-size:13px}
.hint{margin-top:18px;color:var(--muted);font-size:12px;line-height:1.7}
table{width:100%;border-collapse:collapse;margin-top:18px;font-size:13px}
th,td{padding:10px 8px;border-bottom:1px solid rgba(221,217,212,.7);text-align:left;white-space:nowrap}
th{color:var(--muted);font-weight:500;font-size:12px;letter-spacing:.06em}
.tag{display:inline-block;padding:2px 8px;border-radius:999px;border:1px solid var(--line);font-size:12px;color:var(--muted)}
.tag.admin{color:#6b5a3e;border-color:#d9c9ad;background:#f7f1e4}
.tag.off{color:#9a4b3d;border-color:#d8b9b1;background:#fbeeea}
td.ops{display:flex;gap:8px;flex-wrap:wrap}
td.ops button{height:30px;padding:0 10px;font-size:12px;border-radius:8px}
.topline{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.userbox{font-size:13px;color:var(--muted)}
.userbox strong{color:var(--ink);font-weight:600}
@media (max-width:640px){.card{padding:24px 20px}.row{flex-direction:column}}
</style>
</head>
<body>
<div class="card">
  <div class="brand"><i aria-hidden="true"></i>回声科技 · ECHO TECHNOLOGY</div>
  ${body}
</div>
${script ? `<script>${script}</script>` : ""}
</body>
</html>`;
}

/** 简单的 HTML 转义（服务端不需要，页面脚本里用 JS 版本）。 */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
