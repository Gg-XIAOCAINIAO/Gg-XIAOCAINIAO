// 对比 Python 版（server.py）与 Cloudflare Functions 版（本地 Node 运行）的 API 输出。
// 用法：
//   node tools/parity_check.mjs --py http://127.0.0.1:18081 --js http://127.0.0.1:18082
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    py: { type: "string" },
    js: { type: "string" },
  },
});

if (!values.py || !values.js) {
  console.error("usage: node tools/parity_check.mjs --py <url> --js <url>");
  process.exit(1);
}

let failures = 0;
let checks = 0;

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (key === "created_at") continue;
      out[key] = normalize(item);
    }
    return out;
  }
  return value;
}

function compare(label, a, b) {
  checks += 1;
  const left = JSON.stringify(normalize(a));
  const right = JSON.stringify(normalize(b));
  if (left !== right) {
    failures += 1;
    console.error(`FAIL ${label}`);
    const limit = 1200;
    console.error(`  python: ${left.slice(0, limit)}`);
    console.error(`  js    : ${right.slice(0, limit)}`);
    return false;
  }
  return true;
}

async function request(base, method, path, body) {
  const init = { method, headers: {} };
  if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const response = await fetch(base + path, init);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, data };
}

async function both(label, method, path, body) {
  const [py, js] = await Promise.all([
    request(values.py, method, path, body),
    request(values.js, method, path, body),
  ]);
  compare(`${label} :: status`, py.status, js.status);
  compare(`${label} :: body`, py.data, js.data);
  return { py, js };
}

async function waitReady(base, label, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return;
    } catch {
      // 服务还没起来
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`${label} not ready at ${base}`);
}

async function main() {
  await Promise.all([waitReady(values.py, "python"), waitReady(values.js, "js")]);

  // 只读接口逐字段对比
  await both("health", "GET", "/api/health");
  const pyProducts = await both("products", "GET", "/api/products");
  await both("categories", "GET", "/api/categories");
  await both("borrowers", "GET", "/api/borrowers");
  await both("models", "GET", "/api/models");
  await both("history", "GET", "/api/history");
  await both("history borrower", "GET", "/api/history?borrower=" + encodeURIComponent("陈知遥"));
  await both("history keyword", "GET", "/api/history?q=" + encodeURIComponent("沈"));
  await both("history date", "GET", "/api/history?from=2000-01-01&to=2099-12-31");

  const categories = pyProducts ? (await request(values.py, "GET", "/api/categories")).data : [];
  const earPhone = categories
    .flatMap((root) => [root, ...root.children])
    .find((node) => node?.name === "耳机");
  if (earPhone) {
    await both("history category subtree", "GET", `/api/history?category_id=${earPhone.id}`);
  }

  // 写入流程对比（两边使用同样的输入）
  const root = await both("create root", "POST", "/api/categories", { name: "对比大类" });
  const rootId = root.py.data.id;
  const child = await both("create child", "POST", "/api/categories", {
    name: "对比小类",
    parent_id: rootId,
  });
  const childId = child.py.data.id;
  await both("duplicate category", "POST", "/api/categories", {
    name: "对比小类",
    parent_id: rootId,
  });

  const created = await both("create products", "POST", "/api/products", {
    name: "对比产品",
    category_id: childId,
    quantity: 2,
    model_key: "stool",
  });
  const productIds = created.py.data.map((item) => item.id);

  const rented = await both("rent batch", "POST", "/api/rentals/batch", {
    borrower: "对比借用人",
    lend_date: "2026-02-01",
    product_ids: productIds,
  });
  const rentalIds = rented.py.data.rentals.map((item) => item.id);

  await both("product model", "PATCH", `/api/products/${productIds[0]}/model`, {
    model_key: "lounge-chair",
    scale_x: 1.1,
    scale_y: 1,
    scale_z: 0.95,
    finish: "sage",
    seed: 3,
    scope: "same_name",
  });

  await both("delete rented product", "DELETE", `/api/products/${productIds[0]}`);

  await both("return batch", "POST", "/api/rentals/return-batch", {
    return_date: "2026-02-03",
    rental_ids: rentalIds,
  });

  await both("delete product", "DELETE", `/api/products/${productIds[0]}`);
  await both("delete missing product", "DELETE", "/api/products/99999");

  await both("delete child cascade", "DELETE", `/api/categories/${childId}?cascade=1`);
  await both("delete root", "DELETE", `/api/categories/${rootId}`);

  const borrower = await both("create borrower", "POST", "/api/borrowers", {
    name: "对比借用人",
    note: "测试",
  });
  await both("delete borrower", "DELETE", `/api/borrowers/${borrower.py.data.id}`);

  await both("products after writes", "GET", "/api/products");
  await both("history after writes", "GET", "/api/history");
  await both("borrowers after writes", "GET", "/api/borrowers");
  await both("categories after writes", "GET", "/api/categories");

  console.log(`\n${checks - failures}/${checks} parity checks passed`);
  if (failures > 0) {
    console.error(`${failures} parity checks failed`);
    process.exit(1);
  }
  console.log("PARITY OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
