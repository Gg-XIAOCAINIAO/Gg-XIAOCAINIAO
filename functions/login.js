import { htmlPage } from "./_pages.js";
import { getCookie, getSessionUser, sanitizeNext, SESSION_COOKIE } from "./_auth.js";
import { ensureDb } from "./_db.js";

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const next = sanitizeNext(url.searchParams.get("next"));

  if (env && env.DB && env.APP_SECRET) {
    try {
      await ensureDb(env);
      const token = getCookie(request, SESSION_COOKIE);
      const user = token ? await getSessionUser(env.DB, token, env.APP_SECRET) : null;
      if (user) {
        return Response.redirect(new URL(next, url).toString(), 302);
      }
    } catch {
      // 数据库尚未就绪时继续展示登录页
    }
  }

  const script = `(function(){
  var form = document.getElementById('login-form');
  var error = document.getElementById('error');
  var button = document.getElementById('submit');
  var NEXT = ${JSON.stringify(next)};
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    error.textContent = '';
    var username = document.getElementById('username').value.trim();
    var password = document.getElementById('password').value;
    if (!username || !password) {
      error.textContent = '请填写用户名和密码';
      return;
    }
    button.disabled = true;
    button.textContent = '登录中…';
    try {
      var response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
      });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(data.error || ('登录失败（' + response.status + '）'));
      location.replace(NEXT);
    } catch (err) {
      error.textContent = err.message;
      button.disabled = false;
      button.textContent = '登录';
    }
  });
})();`;

  const body = `
  <h1>登录</h1>
  <p class="sub">内部借用系统 · 请使用管理员分配的账号登录</p>
  <form id="login-form" novalidate>
    <label for="username">用户名</label>
    <input id="username" name="username" autocomplete="username" autocapitalize="off" spellcheck="false" required>
    <label for="password">密码</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required>
    <div class="actions"><button id="submit" type="submit">登录</button></div>
    <div class="error" id="error" aria-live="polite"></div>
  </form>
  <p class="hint">忘记密码请联系管理员重置。首次部署用 Cloudflare 里配置的初始管理员账号登录，登录后请到「账号」页修改密码。</p>`;

  return new Response(htmlPage({ title: "登录", body, script }), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
