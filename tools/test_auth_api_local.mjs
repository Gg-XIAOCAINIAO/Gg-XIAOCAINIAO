// 端到端鉴权测试：真实经过 _middleware.js + _app.js，覆盖登录、角色、经手人、停用。
// 运行：node tools/test_auth_api_local.mjs
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { createD1 } from "./d1-shim.mjs";
import { onRequest as middleware } from "../functions/_middleware.js";
import { handle } from "../functions/_app.js";

let checks = 0;
let failures = 0;

function ok(condition, label, extra) {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`FAIL  ${label}${extra ? ` -> ${JSON.stringify(extra).slice(0, 400)}` : ""}`);
  }
}

async function main() {
  const tmpDir = path.join(process.cwd(), ".tmp-tests", `auth-api-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  const db = createD1(path.join(tmpDir, "auth-api.db"));
  const env = {
    DB: db,
    APP_SECRET: "test-secret-key",
    ADMIN_PASSWORD: "admin-pass-123",
    ADMIN_USERNAME: "admin",
    ADMIN_DISPLAY_NAME: "管理员",
    PASSWORD_ITERATIONS: "1000",
  };

  function parseCookie(response) {
    const header = response.headers.get("set-cookie") || "";
    const match = header.match(/rental_session=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  async function dispatch(method, urlPath, { body, cookie, headers } = {}) {
    const init = { method, headers: new Headers(headers || {}) };
    if (cookie) init.headers.set("cookie", `rental_session=${cookie}`);
    if (body !== undefined) {
      init.headers.set("content-type", "application/json");
      init.body = JSON.stringify(body);
    }
    const request = new Request(`http://localhost${urlPath}`, init);
    const response = await middleware({
      request,
      env,
      next: (nextRequest) => handle(nextRequest, env),
    });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: response.status, data, headers: response.headers, location: response.headers.get("location"), cookie: parseCookie(response) };
  }

  try {
    // 未登录
    const anon = await dispatch("GET", "/api/products");
    ok(anon.status === 401, "anonymous API is 401", anon);
    const home = await dispatch("GET", "/");
    ok(home.status === 302 && String(home.location).includes("/login"), "anonymous page redirects to login", home);

    // 登录
    const bad = await dispatch("POST", "/api/login", { body: { username: "admin", password: "nope" } });
    ok(bad.status === 401, "wrong password rejected", bad);
    const login = await dispatch("POST", "/api/login", { body: { username: "admin", password: "admin-pass-123" } });
    ok(login.status === 200 && login.cookie, "admin login returns cookie", login);
    const adminCookie = login.cookie;

    const me = await dispatch("GET", "/api/me", { cookie: adminCookie });
    ok(me.status === 200 && me.data.user.role === "admin", "me returns admin", me);
    const products = await dispatch("GET", "/api/products", { cookie: adminCookie });
    ok(products.status === 200 && products.data.length === 18, "admin reads products", products);

    // 管理员可以建账号，成员不行
    const createdUser = await dispatch("POST", "/api/users", {
      cookie: adminCookie,
      body: { username: "worker", display_name: "测试员工", password: "worker-pass-1", role: "member" },
    });
    ok(createdUser.status === 201 && createdUser.data.role === "member", "admin creates member", createdUser);
    const workerId = createdUser.data.id;
    const duplicate = await dispatch("POST", "/api/users", {
      cookie: adminCookie,
      body: { username: "worker", display_name: "重复", password: "worker-pass-1", role: "member" },
    });
    ok(duplicate.status === 409, "duplicate username rejected", duplicate);

    const workerLogin = await dispatch("POST", "/api/login", {
      body: { username: "worker", password: "worker-pass-1" },
    });
    ok(workerLogin.status === 200 && workerLogin.cookie, "member login works", workerLogin);
    const workerCookie = workerLogin.cookie;

    const workerMe = await dispatch("GET", "/api/me", { cookie: workerCookie });
    ok(workerMe.status === 200 && workerMe.data.user.role === "member", "member me", workerMe);

    const logout = await dispatch("POST", "/api/logout", { cookie: workerCookie });
    ok(logout.status === 200, "logout ok", logout);
    ok(String(logout.headers.get("set-cookie")).includes("Max-Age=0"), "logout clears cookie", logout.headers.get("set-cookie"));
    const relogin = await dispatch("POST", "/api/login", { body: { username: "worker", password: "worker-pass-1" } });
    ok(relogin.status === 200 && relogin.cookie, "member can login again", relogin);
    const workerCookie2 = relogin.cookie;

    // 成员可以自助登记库存：建品类 → 建产品 → 删除在库产品
    const memberCategory = await dispatch("POST", "/api/categories", {
      cookie: workerCookie2,
      body: { name: "成员自建小类" },
    });
    ok(memberCategory.status === 201, "member can create category", memberCategory);

    const memberProduct = await dispatch("POST", "/api/products", {
      cookie: workerCookie2,
      body: {
        name: "成员自建产品",
        category_id: memberCategory.data.id,
        quantity: 1,
        model_key: "stool",
      },
    });
    ok(memberProduct.status === 201 && memberProduct.data.length === 1, "member can create product", memberProduct);
    const memberProductId = memberProduct.data[0].id;

    const memberRename = await dispatch("PATCH", `/api/categories/${memberCategory.data.id}`, {
      cookie: workerCookie2,
      body: { name: "成员改名" },
    });
    ok(memberRename.status === 403, "member cannot rename category", memberRename);

    const memberModel = await dispatch("PATCH", `/api/products/${memberProductId}/model`, {
      cookie: workerCookie2,
      body: { model_key: "stool" },
    });
    ok(memberModel.status === 403, "member cannot change model", memberModel);

    const memberProductRename = await dispatch("PATCH", `/api/products/${memberProductId}`, {
      cookie: workerCookie2,
      body: { name: "成员改名" },
    });
    ok(memberProductRename.status === 403, "member cannot rename product", memberProductRename);

    const memberBorrowerEdit = await dispatch("PATCH", "/api/borrowers/1", {
      cookie: workerCookie2,
      body: { note: "成员改部门" },
    });
    ok(memberBorrowerEdit.status === 403, "member cannot edit borrower department", memberBorrowerEdit);

    const memberDelete = await dispatch("DELETE", `/api/products/${memberProductId}`, { cookie: workerCookie2 });
    ok(memberDelete.status === 200, "member can delete in-stock product", memberDelete);

    const usersForbidden = await dispatch("GET", "/api/users", { cookie: workerCookie2 });
    ok(usersForbidden.status === 403, "member cannot list users", usersForbidden);
    const adminPage = await dispatch("GET", "/admin/users", { cookie: workerCookie2 });
    ok(adminPage.status === 403, "member cannot open admin page", adminPage.status);

    // 经手人记录
    const stock = products.data.find((item) => item.status === "in_stock");
    const rent = await dispatch("POST", "/api/rentals", {
      cookie: workerCookie2,
      body: { borrower: "测试借用人", lend_date: "2026-03-01", product_id: stock.id },
    });
    ok(rent.status === 201, "member can rent", rent);
    const rentalId = rent.data.rental.id;
    const rentedDelete = await dispatch("DELETE", `/api/products/${stock.id}`, { cookie: workerCookie2 });
    ok(rentedDelete.status === 409, "member cannot delete rented product", rentedDelete);
    const history = await dispatch("GET", "/api/history", { cookie: adminCookie });
    const record = history.data.find((item) => item.id === rentalId);
    ok(record && record.lend_operator === "测试员工", "lend operator recorded", record);

    const returned = await dispatch("POST", `/api/rentals/${rentalId}/return`, {
      cookie: adminCookie,
      body: { return_date: "2026-03-02" },
    });
    ok(returned.status === 200, "admin returns rental", returned);
    const historyAfter = await dispatch("GET", "/api/history", { cookie: adminCookie });
    const recordAfter = historyAfter.data.find((item) => item.id === rentalId);
    ok(recordAfter && recordAfter.return_operator === "管理员", "return operator recorded", recordAfter);

    // 停用后旧会话立即失效
    const deactivated = await dispatch("PATCH", `/api/users/${workerId}`, { cookie: adminCookie, body: { active: false } });
    ok(deactivated.status === 200 && deactivated.data.active === false, "admin deactivates member", deactivated);
    const afterDeactivate = await dispatch("GET", "/api/me", { cookie: workerCookie2 });
    ok(afterDeactivate.status === 401, "deactivated session rejected", afterDeactivate);
    const loginDisabled = await dispatch("POST", "/api/login", { body: { username: "worker", password: "worker-pass-1" } });
    ok(loginDisabled.status === 401, "deactivated account cannot login", loginDisabled);

    // 自我保护
    const deleteSelf = await dispatch("DELETE", `/api/users/${me.data.user.id}`, { cookie: adminCookie });
    ok(deleteSelf.status === 400, "cannot delete self", deleteSelf);
    const demoteSelf = await dispatch("PATCH", `/api/users/${me.data.user.id}`, { cookie: adminCookie, body: { role: "member" } });
    ok(demoteSelf.status === 400, "cannot demote self", demoteSelf);


    // 清理会员账号
    const deleted = await dispatch("DELETE", `/api/users/${workerId}`, { cookie: adminCookie });
    ok(deleted.status === 200, "admin deletes member", deleted);
  } finally {
    try {
      db.close();
    } catch {}
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }

  console.log(`\n${checks - failures}/${checks} auth api checks passed`);
  if (failures) {
    console.error(`${failures} auth api checks failed`);
    process.exit(1);
  }
  console.log("ALL AUTH API TESTS PASSED");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
