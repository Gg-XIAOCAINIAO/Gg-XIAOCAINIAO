import { htmlPage } from "../_pages.js";

export async function onRequest() {
  const script = `(function(){
  var tbody = document.getElementById('user-body');
  var error = document.getElementById('error');
  var ok = document.getElementById('ok');
  var who = document.getElementById('who');
  var me = null;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function api(method, path, body) {
    var init = { method: method, headers: {} };
    if (body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    var response = await fetch(path, init);
    var data = await response.json().catch(function () { return {}; });
    if (response.status === 401) { location.replace('/login'); throw new Error('登录已失效'); }
    if (!response.ok) throw new Error(data.error || ('请求失败（' + response.status + '）'));
    return data;
  }

  function rowHtml(user) {
    var isSelf = me && user.id === me.id;
    var ops = '';
    if (!isSelf) {
      ops += '<button class="ghost" data-action="role" data-id="' + user.id + '" data-role="' + (user.role === 'admin' ? 'member' : 'admin') + '">'
        + (user.role === 'admin' ? '设为成员' : '设为管理员') + '</button>';
      ops += '<button class="ghost" data-action="active" data-id="' + user.id + '" data-active="' + (user.active ? '0' : '1') + '">'
        + (user.active ? '停用' : '启用') + '</button>';
      ops += '<button class="danger" data-action="delete" data-id="' + user.id + '">删除</button>';
    }
    ops += '<button class="ghost" data-action="reset" data-id="' + user.id + '">重置密码</button>';
    return '<tr>'
      + '<td>' + esc(user.username) + '</td>'
      + '<td>' + esc(user.display_name) + '</td>'
      + '<td><span class="tag' + (user.role === 'admin' ? ' admin' : '') + '">' + (user.role === 'admin' ? '管理员' : '成员') + '</span></td>'
      + '<td>' + (user.active ? '正常' : '<span class="tag off">已停用</span>') + '</td>'
      + '<td>' + esc(user.last_login_at || '—') + '</td>'
      + '<td class="ops">' + ops + '</td>'
      + '</tr>';
  }

  async function load() {
    var meData = await api('GET', '/api/me');
    me = meData.user;
    who.textContent = me.display_name + '（' + me.username + '，' + (me.role === 'admin' ? '管理员' : '成员') + '）';
    var users = await api('GET', '/api/users');
    tbody.innerHTML = users.map(rowHtml).join('');
  }

  tbody.addEventListener('click', async function (event) {
    var button = event.target.closest('button[data-action]');
    if (!button) return;
    var id = button.getAttribute('data-id');
    var action = button.getAttribute('data-action');
    error.textContent = '';
    ok.textContent = '';
    button.disabled = true;
    try {
      if (action === 'role') {
        await api('PATCH', '/api/users/' + id, { role: button.getAttribute('data-role') });
      } else if (action === 'active') {
        await api('PATCH', '/api/users/' + id, { active: button.getAttribute('data-active') === '1' });
      } else if (action === 'reset') {
        var password = prompt('输入新的临时密码（至少 8 位）');
        if (!password) { button.disabled = false; return; }
        await api('PATCH', '/api/users/' + id, { password: password });
        ok.textContent = '密码已重置，请把临时密码告知该同事。';
      } else if (action === 'delete') {
        if (!confirm('确定删除该账号？历史记录不会删除。')) { button.disabled = false; return; }
        await api('DELETE', '/api/users/' + id);
      }
      await load();
    } catch (err) {
      error.textContent = err.message;
      button.disabled = false;
    }
  });

  document.getElementById('add-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    error.textContent = '';
    ok.textContent = '';
    var username = document.getElementById('username').value.trim();
    var displayName = document.getElementById('display_name').value.trim();
    var password = document.getElementById('password').value;
    var role = document.getElementById('role').value;
    if (!username || !displayName || !password) { error.textContent = '请填写完整信息'; return; }
    var submit = document.getElementById('add-submit');
    submit.disabled = true;
    try {
      await api('POST', '/api/users', { username: username, display_name: displayName, password: password, role: role });
      event.target.reset();
      ok.textContent = '账号已创建。';
      await load();
    } catch (err) {
      error.textContent = err.message;
    } finally {
      submit.disabled = false;
    }
  });

  load().catch(function (err) { error.textContent = err.message; });
})();`;

  const body = `
  <div class="topline">
    <div>
      <h1>账号管理</h1>
      <p class="sub">当前登录：<span id="who">读取中…</span></p>
    </div>
    <a class="ghost" style="text-decoration:none;font-size:13px;color:var(--muted)" href="/">← 返回首页</a>
  </div>

  <form id="add-form" class="row" novalidate style="align-items:flex-end">
    <div>
      <label for="username">用户名</label>
      <input id="username" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="3–32 位字母数字">
    </div>
    <div>
      <label for="display_name">姓名</label>
      <input id="display_name" maxlength="20" placeholder="显示名">
    </div>
    <div>
      <label for="password">初始密码</label>
      <input id="password" type="password" autocomplete="new-password" placeholder="至少 8 位">
    </div>
    <div>
      <label for="role">角色</label>
      <select id="role"><option value="member">成员</option><option value="admin">管理员</option></select>
    </div>
    <div style="flex:0 0 auto"><button id="add-submit" type="submit">添加账号</button></div>
  </form>

  <div class="error" id="error" aria-live="polite"></div>
  <div class="ok" id="ok" aria-live="polite"></div>

  <table>
    <thead><tr><th>账号</th><th>姓名</th><th>角色</th><th>状态</th><th>最近登录</th><th>操作</th></tr></thead>
    <tbody id="user-body"></tbody>
  </table>
  <p class="hint">成员只能查看数据、添加借用人、借出与归还；管理员才能修改品类/产品/模型、补录或删除历史、管理账号。系统始终至少保留一名启用的管理员。</p>`;

  return new Response(htmlPage({ title: "账号管理", body, script, wide: true }), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
