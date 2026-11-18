import { htmlPage } from "./_pages.js";

export async function onRequest() {
  const script = `(function(){
  var form = document.getElementById('password-form');
  var error = document.getElementById('error');
  var ok = document.getElementById('ok');
  var who = document.getElementById('who');
  var button = document.getElementById('submit');

  fetch('/api/me').then(function (response) { return response.json(); }).then(function (data) {
    if (data && data.user) {
      who.textContent = data.user.display_name + '（' + data.user.username + '）';
    }
  }).catch(function () {});

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    error.textContent = '';
    ok.textContent = '';
    var oldPassword = document.getElementById('old_password').value;
    var newPassword = document.getElementById('new_password').value;
    var confirmPassword = document.getElementById('confirm_password').value;
    if (newPassword.length < 8) { error.textContent = '新密码至少 8 位'; return; }
    if (newPassword !== confirmPassword) { error.textContent = '两次输入的新密码不一致'; return; }
    button.disabled = true;
    button.textContent = '保存中…';
    try {
      var response = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
      });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(data.error || ('修改失败（' + response.status + '）'));
      ok.textContent = '密码已更新，正在跳转到登录页…';
      setTimeout(function () { location.replace('/login'); }, 1200);
    } catch (err) {
      error.textContent = err.message;
      button.disabled = false;
      button.textContent = '保存新密码';
    }
  });
})();`;

  const body = `
  <div class="topline">
    <div>
      <h1>账号设置</h1>
      <p class="sub">当前登录：<span id="who">读取中…</span></p>
    </div>
    <a class="ghost" style="text-decoration:none;font-size:13px;color:var(--muted)" href="/">← 返回首页</a>
  </div>
  <form id="password-form" novalidate>
    <label for="old_password">原密码</label>
    <input id="old_password" type="password" autocomplete="current-password" required>
    <div class="row">
      <div>
        <label for="new_password">新密码</label>
        <input id="new_password" type="password" autocomplete="new-password" required>
      </div>
      <div>
        <label for="confirm_password">确认新密码</label>
        <input id="confirm_password" type="password" autocomplete="new-password" required>
      </div>
    </div>
    <div class="actions"><button id="submit" type="submit">保存新密码</button></div>
    <div class="error" id="error" aria-live="polite"></div>
    <div class="ok" id="ok" aria-live="polite"></div>
  </form>
  <p class="hint">修改成功后所有旧登录会失效，需要用新密码重新登录。</p>`;

  return new Response(htmlPage({ title: "账号设置", body, script }), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
