// 本地回归测试：覆盖 server.py 原有测试的 9 类场景（借出/归还/品类/历史/模型等）。
// 运行：node tools/test_api_local.mjs
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { startApi } from "./run_local_api.mjs";

let failures = 0;
let checks = 0;

function check(condition, label) {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`FAIL  ${label}`);
  }
}

function eq(actual, expected, label) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures += 1;
    checks += 1;
    console.error(`FAIL  ${label}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`);
  } else {
    checks += 1;
  }
}

async function main() {
  const tmpDir = path.join(process.cwd(), ".tmp-tests", `api-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  const dbPath = path.join(tmpDir, "test.db");
  const { server, port } = await startApi({ dbPath });
  const base = `http://127.0.0.1:${port}`;

  async function req(method, urlPath, body) {
    const init = { method, headers: {} };
    if (body !== undefined) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    const response = await fetch(base + urlPath, init);
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: response.status, data };
  }

  try {
    // 1. 种子数据与静态结构
    const health = await req("GET", "/api/health");
    eq(health.status, 200, "health status");
    eq(health.data.ok, true, "health ok");

    const productsRes = await req("GET", "/api/products");
    check(Array.isArray(productsRes.data) && productsRes.data.length === 18, "products seed = 18");
    const first = productsRes.data[0];
    eq(first.asset_code, "P" + String(first.id).padStart(4, "0"), "asset_code");
    check(typeof first.category_path === "string" && first.category_path.includes(" / "), "category_path");
    check(["in_stock", "rented"].includes(first.status), "product status value");

    const categoriesRes = await req("GET", "/api/categories");
    check(Array.isArray(categoriesRes.data) && categoriesRes.data.length === 9, "root categories = 9");
    check(categoriesRes.data.every((node) => node.depth === 1 && Array.isArray(node.children)), "category tree shape");

    const modelsRes = await req("GET", "/api/models");
    check(modelsRes.data.builtin.length === 56, "builtin models = 56");
    check(modelsRes.data.custom.length === 0, "no custom models");

    const borrowersRes = await req("GET", "/api/borrowers");
    check(Array.isArray(borrowersRes.data) && borrowersRes.data.length === 6, "borrowers = 6");
    check(
      borrowersRes.data.every((item) => item.items.length === item.total_count),
      "borrower item count matches total_count",
    );

    const historyRes = await req("GET", "/api/history");
    check(historyRes.data.length === 42, "history = 42");
    check(historyRes.data.every((row) => row.status === "rented" || row.status === "returned"), "history status values");

    // 2. 历史筛选
    const byBorrower = await req("GET", "/api/history?borrower=" + encodeURIComponent("陈知遥"));
    check(byBorrower.data.length > 0 && byBorrower.data.every((row) => row.borrower === "陈知遥"), "history borrower filter");

    const earPhone = categoriesRes.data
      .flatMap((root) => [root, ...root.children])
      .find((node) => node.name === "耳机");
    check(Boolean(earPhone), "found 耳机 category");
    const earPhoneNames = new Set();
    (function collect(node) {
      earPhoneNames.add(node.name);
      for (const child of node.children) collect(child);
    })(earPhone);
    const byCategory = await req("GET", `/api/history?category_id=${earPhone.id}`);
    check(
      byCategory.data.length > 0 && byCategory.data.every((row) => earPhoneNames.has(row.category)),
      "history category_id filter uses descendants",
    );

    const keyword = await req("GET", "/api/history?q=" + encodeURIComponent("沈叙白"));
    check(
      keyword.data.length > 0 && keyword.data.every((row) => row.borrower.includes("沈叙白") || row.product_name.includes("沈叙白")),
      "history keyword filter",
    );

    const dateRange = await req("GET", "/api/history?from=2020-01-01&to=2999-01-01");
    check(dateRange.data.length === 42, "history date range");

    // 3. 品类管理 + 批量借出/归还
    const rootRes = await req("POST", "/api/categories", { name: "测试大类" });
    eq(rootRes.status, 201, "create root category");
    const rootId = rootRes.data.id;
    const childRes = await req("POST", "/api/categories", { name: "测试小类", parent_id: rootId });
    eq(childRes.status, 201, "create child category");
    const childId = childRes.data.id;
    const dupRes = await req("POST", "/api/categories", { name: "测试小类", parent_id: rootId });
    eq(dupRes.status, 409, "duplicate category rejected");

    const createProducts = await req("POST", "/api/products", {
      name: "测试借出椅",
      category_id: childId,
      quantity: 2,
      model_key: "stool",
    });
    eq(createProducts.status, 201, "create products");
    check(createProducts.data.length === 2, "created 2 products");
    const [p1, p2] = createProducts.data.map((item) => item.id);

    const batchRent = await req("POST", "/api/rentals/batch", {
      borrower: "测试借用人",
      lend_date: "2026-01-05",
      product_ids: [p1, p2],
    });
    eq(batchRent.status, 201, "batch rent");
    check(batchRent.data.rentals.length === 2, "batch rent returns 2 rentals");
    check(batchRent.data.products.every((item) => item.status === "rented"), "products rented");

    const afterRent = await req("GET", "/api/products");
    check(afterRent.data.filter((item) => [p1, p2].includes(item.id)).every((item) => item.status === "rented"), "rented persisted");

    const rentalIds = batchRent.data.rentals.map((item) => item.id);
    const batchReturn = await req("POST", "/api/rentals/return-batch", {
      return_date: "2026-01-06",
      rental_ids: rentalIds,
    });
    eq(batchReturn.status, 200, "batch return");
    check(batchReturn.data.products.every((item) => item.status === "in_stock"), "products back in stock");
    const historyAfterReturn = await req("GET", "/api/history?borrower=" + encodeURIComponent("测试借用人"));
    check(historyAfterReturn.data.length === 2, "history kept after return");
    check(historyAfterReturn.data.every((row) => row.status === "returned"), "history marked returned");

    // 4. 单件接口 + 参数校验
    const singleRent = await req("POST", "/api/rentals", {
      borrower: "单件测试",
      lend_date: "2026-01-07",
      product_id: p1,
    });
    eq(singleRent.status, 201, "single rent");
    const singleReturn = await req("POST", `/api/rentals/${singleRent.data.rental.id}/return`, {
      return_date: "2026-01-08",
    });
    eq(singleReturn.status, 200, "single return");

    eq((await req("POST", "/api/rentals/batch", { borrower: "", lend_date: "2026-01-01", product_ids: [p1] })).status, 400, "missing borrower rejected");
    eq((await req("POST", "/api/rentals/batch", { borrower: "x", lend_date: "2026-13-01", product_ids: [p1] })).status, 400, "bad date rejected");
    eq((await req("POST", "/api/rentals/batch", { borrower: "x", lend_date: "2026-01-01", product_ids: [p1, p1] })).status, 400, "duplicate ids rejected");
    eq((await req("POST", "/api/rentals/batch", { borrower: "x", lend_date: "2026-01-01", product_ids: [99999] })).status, 404, "missing product rejected");

    // 4b. 删除产品（在库可删、在借拒绝、历史保留）
    eq((await req("DELETE", `/api/products/${p1}`)).status, 200, "delete in-stock product");
    const afterProductDelete = await req("GET", "/api/products");
    check(!afterProductDelete.data.some((item) => item.id === p1), "deleted product removed from list");
    const rentP2 = await req("POST", "/api/rentals", {
      borrower: "删除测试",
      lend_date: "2026-01-06",
      product_id: p2,
    });
    eq(rentP2.status, 201, "rent p2 before delete attempt");
    eq((await req("DELETE", `/api/products/${p2}`)).status, 409, "cannot delete rented product");
    await req("POST", `/api/rentals/${rentP2.data.rental.id}/return`, { return_date: "2026-01-07" });
    eq((await req("DELETE", `/api/products/${p2}`)).status, 200, "delete product after return");
    eq((await req("DELETE", `/api/products/99999`)).status, 404, "delete missing product rejected");

    // 5. 删除产品后历史保留
    const delCategory = await req("DELETE", `/api/categories/${childId}?cascade=1`);
    eq(delCategory.status, 200, "delete category cascade");
    check(delCategory.data.deleted_products === 0, "cascade has no products left");
    const historyKept = await req("GET", "/api/history?borrower=" + encodeURIComponent("测试借用人"));
    check(historyKept.data.length === 2, "history survives product delete");
    const productsAfterDelete = await req("GET", "/api/products");
    check(!productsAfterDelete.data.some((item) => [p1, p2].includes(item.id)), "products removed");

    const deleteRoot = await req("DELETE", `/api/categories/${rootId}`);
    eq(deleteRoot.status, 200, "delete empty root category");

    // 6. 模型工坊
    const studioRoot = await req("POST", "/api/categories", { name: "模型测试类" });
    const studioChild = await req("POST", "/api/categories", { name: "模型测试小类", parent_id: studioRoot.data.id });
    const studioProducts = await req("POST", "/api/products", {
      name: "模型测试椅",
      category_id: studioChild.data.id,
      quantity: 2,
      model_key: "lounge-chair",
    });
    const studioId = studioProducts.data[0].id;
    const patchModel = await req("PATCH", `/api/products/${studioId}/model`, {
      model_key: "stool",
      scale_x: 1.1,
      scale_y: 1.05,
      scale_z: 1,
      finish: "clay",
      seed: 7,
      scope: "same_name",
    });
    eq(patchModel.status, 200, "patch product model");
    eq(patchModel.data.updated, 2, "same_name scope updates 2 products");
    check(patchModel.data.model_url.includes("sx=1.1"), "model url has sx");
    check(patchModel.data.model_url.includes("finish=clay"), "model url has finish");
    check(patchModel.data.model_url.includes("sz=1"), "scale params include sz");
    eq((await req("PATCH", `/api/products/${studioId}/model`, { model_key: "nope" })).status, 400, "invalid model rejected");
    eq((await req("PATCH", `/api/products/${studioId}/model`, { model_key: "stool", scale_x: 2 })).status, 400, "scale out of range rejected");

    // 7. 四级品类上限
    let parent = (await req("POST", "/api/categories", { name: "四级根" })).data.id;
    for (const name of ["二级", "三级", "四级"]) {
      const created = await req("POST", "/api/categories", { name, parent_id: parent });
      eq(created.status, 201, `create category level ${name}`);
      parent = created.data.id;
    }
    const tooDeep = await req("POST", "/api/categories", { name: "五级", parent_id: parent });
    eq(tooDeep.status, 400, "fifth level rejected");

    // 8. 借用人 + 模型库
    const borrower = await req("POST", "/api/borrowers", { name: "模型测试人", note: "研发部" });
    eq(borrower.status, 201, "create borrower");
    eq((await req("POST", "/api/borrowers", { name: "模型测试人" })).status, 409, "duplicate borrower rejected");

    const rentForBorrower = await req("POST", "/api/rentals", {
      borrower: "模型测试人",
      lend_date: "2026-01-09",
      product_id: studioId,
    });
    eq((await req("DELETE", `/api/borrowers/${borrower.data.id}`)).status, 409, "cannot delete borrower with active rental");
    eq((await req("POST", "/api/models/hide", { key: "stool" })).status, 409, "cannot hide model in use");
    eq((await req("POST", "/api/models/hide", { key: "bed" })).status, 200, "hide unused model");
    eq((await req("POST", "/api/models/restore", { key: "bed" })).status, 200, "restore model");
    eq((await req("POST", "/api/models/import", { data: "x" })).status, 501, "online model import disabled");
    await req("POST", `/api/rentals/${rentForBorrower.data.rental.id}/return`, { return_date: "2026-01-10" });
    eq((await req("DELETE", `/api/borrowers/${borrower.data.id}`)).status, 200, "delete borrower after return");

    // 9. 级联删除与空品类
    const emptyRoot = await req("POST", "/api/categories", { name: "空品类" });
    eq((await req("DELETE", `/api/categories/${emptyRoot.data.id}`)).status, 200, "delete empty category");
  } finally {
    server.close();
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* 忽略沙箱清理失败 */ }
  }

  console.log(`\n${checks - failures}/${checks} checks passed`);
  if (failures > 0) {
    console.error(`${failures} checks failed`);
    process.exit(1);
  }
  console.log("ALL LOCAL API TESTS PASSED");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
