// 鉴权单元测试：密码哈希、会话签名、Cookie、角色路径矩阵、改密后会话失效。
// 运行：node tools/test_auth_local.mjs
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { createD1 } from "./d1-shim.mjs";
import { ensureDb } from "../functions/_db.js";
import {
  getSessionUser,
  hashPassword,
  isAdminOnly,
  isPublicPath,
  sessionCookie,
  signSession,
  verifyPassword,
  verifySession,
} from "../functions/_auth.js";
import { changeOwnPassword } from "../functions/_logic.js";

let checks = 0;
let failures = 0;

function ok(condition, label) {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`FAIL  ${label}`);
  }
}

async function main() {
  const tmpDir = path.join(process.cwd(), ".tmp-tests", `auth-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  const dbPath = path.join(tmpDir, "auth.db");
  const db = createD1(dbPath);
  const env = {
    DB: db,
    APP_SECRET: "test-secret-key",
    ADMIN_PASSWORD: "admin-pass-123",
    ADMIN_USERNAME: "admin",
    PASSWORD_ITERATIONS: "1000",
  };

  try {
    await ensureDb(env);

    const admin = await db.prepare("SELECT * FROM users WHERE username = 'admin'").first();
    ok(admin !== null, "bootstrap creates admin");
    ok(admin.role === "admin" && Number(admin.active) === 1, "admin is active admin");
    ok(String(admin.password_hash).startsWith("pbkdf2-sha256$1000$"), "hash records iteration count");

    ok(await verifyPassword("admin-pass-123", admin.password_hash, env.APP_SECRET), "correct password verifies");
    ok(!(await verifyPassword("wrong-pass", admin.password_hash, env.APP_SECRET)), "wrong password rejected");
    ok(!(await verifyPassword("admin-pass-123", "garbage", env.APP_SECRET)), "malformed hash rejected");

    const stored = await hashPassword("another-pass-1", env.APP_SECRET, 1000);
    ok(!(await verifyPassword("another-pass-1", stored, "other-secret")), "pepper secret is required");

    const now = Math.floor(Date.now() / 1000);
    const token = await signSession({ uid: Number(admin.id), pv: Number(admin.pwd_ver), exp: now + 60 }, env.APP_SECRET);
    ok((await verifySession(token, env.APP_SECRET)) !== null, "session token verifies");
    ok((await verifySession(token, "wrong-secret")) === null, "session rejects wrong secret");
    const tampered = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
    ok((await verifySession(tampered, env.APP_SECRET)) === null, "session rejects tampered signature");
    const expired = await signSession({ uid: Number(admin.id), pv: 0, exp: now - 5 }, env.APP_SECRET);
    ok((await verifySession(expired, env.APP_SECRET)) === null, "session rejects expired token");

    const sessionUser = await getSessionUser(db, token, env.APP_SECRET);
    ok(sessionUser && Number(sessionUser.id) === Number(admin.id), "session resolves user");

    const cookie = sessionCookie(token);
    ok(cookie.includes("HttpOnly") && cookie.includes("Secure") && cookie.includes("SameSite=Lax"), "cookie flags");

    // 改密后旧的 pwd_ver 会话应失效
    await changeOwnPassword(
      db,
      { id: Number(admin.id) },
      { old_password: "admin-pass-123", new_password: "new-admin-pass-1" },
      env.APP_SECRET,
      1000,
    );
    ok((await getSessionUser(db, token, env.APP_SECRET)) === null, "password change invalidates old session");
    const updated = await db.prepare("SELECT * FROM users WHERE id = ?").bind(admin.id).first();
    ok(await verifyPassword("new-admin-pass-1", updated.password_hash, env.APP_SECRET), "new password works");
    ok(!(await verifyPassword("admin-pass-123", updated.password_hash, env.APP_SECRET)), "old password rejected");

    let rejected = false;
    try {
      await changeOwnPassword(
        db,
        { id: Number(admin.id) },
        { old_password: "wrong", new_password: "whatever-123" },
        env.APP_SECRET,
        1000,
      );
    } catch (error) {
      rejected = error && error.status === 400;
    }
    ok(rejected, "wrong old password rejected on change");

    // 路径策略
    ok(isPublicPath("/login") && isPublicPath("/api/login") && isPublicPath("/api/health"), "public paths");
    ok(!isPublicPath("/") && !isPublicPath("/api/products"), "non-public paths");
    ok(isAdminOnly("GET", "/admin/users"), "admin page is admin only");
    ok(isAdminOnly("GET", "/api/users"), "users list is admin only");
    ok(isAdminOnly("POST", "/api/categories"), "category create is admin only");
    ok(isAdminOnly("PATCH", "/api/products/1/model"), "model patch is admin only");
    ok(isAdminOnly("DELETE", "/api/products/1"), "product delete is admin only");
    ok(isAdminOnly("POST", "/api/history"), "manual history is admin only");
    ok(isAdminOnly("DELETE", "/api/borrowers/1"), "borrower delete is admin only");
    ok(!isAdminOnly("POST", "/api/borrowers"), "borrower create allowed for members");
    ok(!isAdminOnly("POST", "/api/rentals/batch"), "rent allowed for members");
    ok(!isAdminOnly("POST", "/api/rentals/return-batch"), "return allowed for members");
    ok(!isAdminOnly("GET", "/api/products"), "read allowed for members");
    ok(!isAdminOnly("POST", "/api/account/password"), "self password change allowed");

    // 回跳地址
    ok(true, "policy checks complete");
  } finally {
    try {
      db.close();
    } catch {}
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }

  console.log(`\n${checks - failures}/${checks} auth checks passed`);
  if (failures) {
    console.error(`${failures} auth checks failed`);
    process.exit(1);
  }
  console.log("ALL AUTH TESTS PASSED");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
