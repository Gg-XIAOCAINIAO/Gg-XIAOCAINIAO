# 实现说明

本次在原有视觉系统上增加了三类能力：

1. 可管理、可改名的最多四级品类；
2. 管理员新增品类 / 产品、隐藏的管理抽屉；
3. 同一借用人一次借出多件（含同款多件）与批量归还。

完整代码：

- 建表：[`db/schema.sql`](../db/schema.sql)
- 服务端：[`server.py`](../server.py)
- 前端：[`public/app.js`](../public/app.js)、[`public/index.html`](../public/index.html)、[`public/styles.css`](../public/styles.css)
- 3D：[`public/viewer3d.js`](../public/viewer3d.js)

---

## 1. 数据模型

核心借用状态与流水仍是两张主表；为了支持管理员自由命名、增加、删除品类，新增 `categories` 树表；借用人名录、外部模型和内置模型移除状态分别由 `borrowers`、`custom_models`、`hidden_models` 维护。

```sql
CREATE TABLE categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id   INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
    name        TEXT    NOT NULL CHECK (TRIM(name) <> ''),
    sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX idx_categories_root_name
    ON categories(name COLLATE NOCASE) WHERE parent_id IS NULL;

CREATE UNIQUE INDEX idx_categories_child_name
    ON categories(parent_id, name COLLATE NOCASE) WHERE parent_id IS NOT NULL;

CREATE TABLE products (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id        INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
    category           TEXT    NOT NULL,
    name               TEXT    NOT NULL,
    model_url          TEXT    NOT NULL,
    status             TEXT    NOT NULL DEFAULT 'in_stock'
                       CHECK (status IN ('in_stock', 'rented')),
    current_borrower   TEXT,
    current_lend_date  TEXT,
    CHECK (
        (status = 'in_stock' AND current_borrower IS NULL AND current_lend_date IS NULL)
        OR (status = 'rented' AND current_borrower IS NOT NULL AND current_lend_date IS NOT NULL)
    )
);

CREATE TABLE rental_history (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id    INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name  TEXT NOT NULL,
    category      TEXT NOT NULL,
    borrower      TEXT NOT NULL,
    lend_date     TEXT NOT NULL,
    return_date   TEXT,
    status        TEXT NOT NULL CHECK (status IN ('rented', 'returned')),
    CHECK (
        (status = 'rented' AND return_date IS NULL)
        OR (status = 'returned' AND return_date IS NOT NULL)
    )
);

CREATE TABLE borrowers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL COLLATE NOCASE UNIQUE,
    note        TEXT    NOT NULL DEFAULT '',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE custom_models (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    model_key      TEXT    NOT NULL UNIQUE,
    name           TEXT    NOT NULL,
    file_name      TEXT    NOT NULL UNIQUE,
    original_name  TEXT    NOT NULL DEFAULT '',
    size_bytes     INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE hidden_models (
    model_key  TEXT PRIMARY KEY,
    hidden_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
```

### 为什么品类最多四级

`parent_id` 形成自引用树，服务端计算父级深度：父级深度小于 4 才允许继续添加，因此最多出现「一级 / 二级 / 三级 / 四级」四个层级。品类名在同级下不区分大小写唯一。

### 产品与同款

不为产品增加 `quantity` 列，而是**一件库存一行**。管理员新增产品时填写数量 2，就插入两条同名记录；每条拥有独立 `id`、`asset_code` 和借还流水。这样才能准确追踪“同一人借了两件同款，但归还了其中一件”。

`rental_history.product_name` / `category` 是借出时的快照；即使之后管理员改名或删除产品，历史仍然完整。

借用人单独存于 `borrowers` 表。首次升级时从历史流水与在借产品回填一次，之后以名录为准；删除借用人不会删除历史流水，因此历史筛选仍能看到旧名字。新增借用或补录历史时会自动把新名字登记进名录。

外部模型以 `custom_models.model_key` 写入 `products.model_url`；文件保存在 `public/assets/models/uploads/`。内置模型被“移除”时只写入 `hidden_models`，不删除代码，因此可以恢复。

### 公司目录数据导入

原始目录保存在 [`db/company_products.json`](../db/company_products.json)：

```text
34 个品类 | 61 个细分 | 613 个产品型号
```

系统没有把 613 个型号全部当作可借库存，而是：

1. 按业务域整理为 9 个一级大类、39 个二级品类、40 个三级细分；
2. 将现有 18 件库存重新映射到新的三级品类；
3. 从 613 个型号对应的 40 个几何原型中，生成 39 个可用的 3D 模型原型（P01–P39）；
4. P40「宽带」为服务类，无实体 3D 模型。

这样既保留了公司目录的真实分类关系，又不会让目录型号和实际可借资产混在一起。

---

## 2. 品类管理

### 2.1 品类树与计数

```python
def list_categories(conn):
    rows = conn.execute(
        """
        SELECT c.*,
               COUNT(p.id) AS direct_count,
               COALESCE(SUM(CASE WHEN p.status = 'rented' THEN 1 ELSE 0 END), 0) AS direct_rented
          FROM categories c
          LEFT JOIN products p ON p.category_id = c.id
         GROUP BY c.id
         ORDER BY c.sort_order, c.id
        """
    ).fetchall()
    # 先建立节点，再把子类计数累加到大类，返回 roots
```

返回结构：

```json
[
  {
    "id": 17,
    "name": "耳机",
    "parent_id": null,
    "product_count": 6,
    "borrowed_count": 4,
    "children": [
      {"id": 18, "name": "蓝牙耳机", "product_count": 2, "borrowed_count": 2},
      {"id": 19, "name": "有线耳机", "product_count": 1, "borrowed_count": 0}
    ]
  }
]
```

[`server.py`](../server.py#L383)

### 2.2 新增 / 改名

```python
def create_category(conn, payload):
    name = clean_text(payload.get("name"), "品类名称", 30)
    parent_id = payload.get("parent_id")
    if parent_id:
        parent = get_category(conn, parent_id)
        if parent_depth >= 4:
            raise ApiError(400, "最多支持四级品类，不能在四级品类下继续添加")
    # 同级重名检查、sort_order 取同级最大值 +1
    conn.execute(
        "INSERT INTO categories (parent_id, name, sort_order) VALUES (?, ?, ?)",
        (parent_id, name, next_order),
    )
```

改名时同时同步 `products.category` 冗余小类名：

```python
conn.execute("UPDATE categories SET name = ? WHERE id = ?", (name, category_id))
conn.execute("UPDATE products SET category = ? WHERE category_id = ?", (name, category_id))
```

借还流水里的 `category` **不更新**，因为它记录的是借出时的事实。大类改名不会改动产品的小类名，展示时通过 join 自动得到新的父级路径。

[`server.py`](../server.py#L571)

### 2.3 删除与级联

```text
DELETE /api/categories/:id             有子类 / 产品时返回 409
DELETE /api/categories/:id?cascade=1   级联删除子类和产品
DELETE /api/products/:id               删除单件在库产品，在借时返回 409
```

级联删除前先检查该品类树中是否有 `rented` 产品；有在借产品则拒绝，避免流水中的进行中记录失去产品。删除产品触发 `rental_history.product_id -> NULL`，历史记录与其 `product_name` 保留。

前端会先显示二次确认；含有产品时提示将一并移除多少件，历史保留。空品类无需确认级联。

[`server.py`](../server.py#L713)、[`public/app.js`](../public/app.js#L1773)

---

## 3. 多件借出与批量归还

### 3.1 新增产品（含同款数量）

```python
quantity = parse_int(payload.get("quantity", 1), "quantity", 1, 50)
model_url = f"/assets/models/{model_key}.glb"

for _ in range(quantity):
    cur = conn.execute(
        """
        INSERT INTO products
            (category_id, category, name, model_url, status,
             current_borrower, current_lend_date)
        VALUES (?, ?, ?, ?, 'in_stock', NULL, NULL)
        """,
        (category_id, category["name"], name, model_url),
    )
```

管理员只能选择最末级小类；选择带子类的大类会得到「请选择最末级小类」。

[`server.py`](../server.py#L689)

### 3.2 批量借出事务

```python
def create_rentals_batch(conn, payload):
    borrower = clean_borrower(payload.get("borrower"))
    lend_date = parse_iso_date(payload.get("lend_date"), "lend_date")
    product_ids = normalize_product_ids(payload.get("product_ids"))

    conn.execute("BEGIN IMMEDIATE")
    products = []
    for product_id in product_ids:
        product = get_product(conn, product_id)
        if product is None:
            raise ApiError(404, f"产品 #{product_id} 不存在")
        if product["status"] != "in_stock":
            raise ApiError(409, f"「{product['name']}」当前已借出")
        products.append(product)

    for product in products:
        conn.execute(
            """
            UPDATE products
               SET status = 'rented', current_borrower = ?, current_lend_date = ?
             WHERE id = ? AND status = 'in_stock'
            """,
            (borrower, lend_date, product["id"]),
        )
        conn.execute(
            """
            INSERT INTO rental_history
                (product_id, product_name, category, borrower,
                 lend_date, return_date, status)
            VALUES (?, ?, ?, ?, ?, NULL, 'rented')
            """,
            (product["id"], product["name"], product["category"], borrower, lend_date),
        )
    conn.commit()
```

- 请求里的 ID 必须唯一，最多 50 件；
- 先检查全部产品，再统一更新；任一失败整体回滚；
- 每件产品各自写入一条 `rental_history`，所以历史表格和统计都能按件追溯。

[`server.py`](../server.py#L749)

### 3.3 批量归还事务

```python
rental_ids = normalize_rental_ids(payload.get("rental_ids"))
return_date = parse_iso_date(payload.get("return_date"), "return_date")

conn.execute("BEGIN IMMEDIATE")
for rental_id in rental_ids:
    rental = get_rental(conn, rental_id)
    # 校验：存在、rented、产品仍在、归还日期不早于出借日期
    conn.execute(
        """
        UPDATE products
           SET status = 'in_stock', current_borrower = NULL, current_lend_date = NULL
         WHERE id = ? AND status = 'rented'
        """,
        (rental["product_id"],),
    )
    conn.execute(
        """
        UPDATE rental_history SET return_date = ?, status = 'returned'
         WHERE id = ? AND status = 'rented'
        """,
        (return_date, rental_id),
    )
conn.commit()
```

单件接口仍保留：`POST /api/rentals` 与 `POST /api/rentals/:id/return`，内部复用批量实现。

[`server.py`](../server.py#L822)

---

## 4. 前端

### 4.1 四级品类侧栏

```html
<div class="category-group is-expanded">
  <button class="category-button category-root-button" data-category-id="17">
    <span class="category-index">06</span>
    <span class="category-name">耳机</span>
    <span class="category-count">6</span>
    <svg class="category-caret">…</svg>
  </button>
  <div class="category-children">
    <button class="category-button category-child-button" data-category-id="18">
      <span class="category-name">蓝牙耳机</span>
      <span class="category-count">2</span>
    </button>
    …
  </div>
</div>
```

- 点击大类：筛出整个大类并展开子类；再次点击同一大类即可缩回；
- 点击小类：按小类过滤；带子类的小类同样支持再次点击缩回；
- 展开状态只由 `expandedCategoryIds` 决定，筛选中的父级不会强制撑开子级；
- 默认只显示有库存的品类，侧栏底部「显示空类目 / 隐藏空类目」可切换完整目录，并记住本次选择；
- 点击「全部」会清空筛选并收起整棵树；
- 管理入口：侧栏顶部「＋」、顶栏「管理」；
- `activeCategoryId` 只存 ID，因此改名后无需迁移前端状态。

[`public/app.js`](../public/app.js#L597)

### 4.2 管理抽屉

- 新增品类表单：名称 + 归属（「作为一级大类」或选择某个现有大类）；
- 品类树：每个节点显示产品数 / 在借数，带「添加子类」「改名」「删除」操作；
- 每个有子类或有器物的节点前有独立折叠按钮（`adminFoldedCategoryIds`），右上角「全部收回 / 全部展开」操作整棵树；折叠只影响该节点的子类与器物，其他分支不受影响；
- 展开时，各品类下用标签列出直接归属的器物名称、件数与在借件数（`categoryProductList()` 按名称聚合 `state.products`，`Intl.Collator('zh-CN', {numeric:true})` 排序，同品牌自然相邻）；主界面器物列表也用 `sortProductsByName()` 在品类内做同样的排序；
- 改名采用行内输入，Enter 保存，Esc 取消；
- 新增产品表单：名称、最末级小类、数量 1–50、展示模型；新增品类 / 产品后会自动展开对应路径，避免“加了却看不见”；
- 器物列表标题右侧「怎么添加产品」按钮打开四步指南弹窗，可一键关闭并打开管理面板；
- 抽屉底部保留品牌「回声科技」。

[`public/app.js`](../public/app.js#L1156)、[`public/styles.css`](../public/styles.css#L2122)

### 4.3 多件借出

`buildRentGroups()` 把在库产品按「名称 + 小类 + 模型」分组，每组记录可借数量：

```javascript
const key = `${product.name}|${product.category_id}|${product.model_url}`;
group.products.push(product); // 同款多件成为同一组的多个库存
```

打开弹窗时，当前产品所在组默认数量 1，并移到列表最上方；用户可以：

- 修改当前组的数量，一次借两件同款；
- 选择其他在库产品；
- 每个组最多能加到该组实际可借数量。

提交前按每组数量截取产品 ID：

```javascript
for (const group of state.rentGroups) {
  if (group.quantity > 0) {
    productIds.push(...group.products.slice(0, group.quantity).map(item => item.id));
  }
}
await api("/api/rentals/batch", {
  method: "POST",
  body: { borrower, lend_date: lendDate, product_ids: productIds },
});
```

[`public/app.js`](../public/app.js#L813)、[`public/app.js`](../public/app.js#L910)

### 4.4 批量归还

打开在借产品的归还弹窗时，会列出**同一借用人的全部在借清单**；当前产品默认勾选，其余可选：

```javascript
const activeItems = state.products.filter((item) =>
  item.status === "rented"
  && item.current_borrower === borrower
  && item.active_rental_id
);
```

提交时把勾选项的 `active_rental_id` 数组交给 `/api/rentals/return-batch`。归还日期下限取所选记录中最晚的出借日期，由前后端双重校验。

[`public/app.js`](../public/app.js#L1013)、[`public/app.js`](../public/app.js#L1042)

### 4.5 历史筛选

历史筛选的「品类」下拉现在按大类分组：

```html
<optgroup label="耳机">
  <option value="17">耳机（全部）</option>
  <option value="18">蓝牙耳机</option>
  <option value="19">有线耳机</option>
  …
</optgroup>
```

请求参数使用 `category_id`；服务端解析大类时会把子类名一起加入 `IN (...)`，因此选「耳机（全部）」能过滤全部耳机小类。

[`server.py`](../server.py#L470)、[`public/app.js`](../public/app.js#L635)

### 4.6 3D 模型工坊

产品视图右上角「模型样式」按钮会打开右侧工坊。主 3D 展台保持可见，选择常用形态、拖动比例或切换色调时即时预览；只有点击「保存模型」才写入数据库。

模型工坊把 56 个唯一形态拆成两段展示，避免重复选项：17 个常用形态（去掉与公司原型重复的 8 个）和 39 个公司原型。已选模型若属于公司原型，会在原型列表中显示选中态，当前名称仍显示在「常用形态」标题右侧。

```javascript
const parsed = parseModelUrl(product.model_url);
state.modelDraft = {
  modelKey: parsed.key,
  scale: { ...parsed.scale },
  finish: parsed.finish,
  scope: "current",
};
```

保存时：

```javascript
await api(`/api/products/${product.id}/model`, {
  method: "PATCH",
  body: {
    model_key: draft.modelKey,
    scale_x: draft.scale.x,
    scale_y: draft.scale.y,
    scale_z: draft.scale.z,
    finish: draft.finish,
    seed: draft.seed,
    scope: draft.scope, // current | same_name | category
  },
});
```

变体参数编码在 `model_url` 查询串中，不需要新增表字段：

```text
/assets/models/office-chair.glb?sx=1.1&sy=1.04&sz=1&finish=clay
/assets/models/generated.glb?seed=839201&finish=sage
```

### 按品类名生成

模型工坊里的「没有合适模型？输入新品类名生成」会读取名称中的关键词：

```text
椅 / 凳 / 沙发 → 座椅类
耳机 / 耳麦 → 无线、有线、游戏、降噪
灯 / 桌 / 柜 / 床 / 屏 / 电脑 / 电器 / 花器 / 绿植 → 对应形态
无法识别 → generated 通用生成器
```

生成器同时根据名称计算稳定的比例、色调和 `seed`。`generated` 使用种子在 Three.js 中组合出一件可继续调整的体块模型，刷新页面后仍能复现同一形态。生成结果只进入预览，点击「保存模型」后才写库。

### 公司原型库

`PROTOTYPE_MODELS` 按公司目录的 P01–P40 整理：

- 39 个实体原型中，8 个复用已有基础形态、31 个为新增原型形态；
- 工坊按「17 个常用形态 + 39 个公司原型」去重展示，共 56 个唯一模型；
- 模型工坊提供按编号 / 名称 / 品类搜索的原型列表，选中后立即预览；
- 新增产品表单会按所选品类自动推荐原型模型，例如「键盘 → P08 机械键盘」；
- P40 宽带为服务类，列表标记为“无实体”，不生成 3D。

`parseModelUrl()` 解析出模型 slug、比例、色调与生成种子；`ProductViewer` 据此选择程序化模型、应用材质色板并做非等比缩放。服务端提供 56 个模型 slug 与 5 种色调白名单，非法值会返回 `400`。

[`public/app.js`](../public/app.js#L1464)、[`public/viewer3d.js`](../public/viewer3d.js#L948)、[`server.py`](../server.py#L827)

### 4.7 借出后状态与「再借同类」

- 产品为 `rented` 时，中央按钮固定为「归还产品」，不会出现借出入口；
- 借出弹窗只读取 `status = 'in_stock'` 的产品；服务端也会在事务里再次校验，已借出产品返回 `409`；
- 若同类还有在库产品，归还按钮旁会出现「再借同类」按钮，自动选择一件同类在库产品，并预填当前借用人；
- 同类匹配优先使用「同名 + 同小类」，其次使用「同模型 + 同父级」，适配四级品类下的颜色 / 规格变体。

```javascript
const alternatives = state.products.filter((item) =>
  item.status === "in_stock"
  && (
    (item.name === product.name && item.category_id === product.category_id)
    || (modelKey(item) === modelKey(product) && item.category_parent === product.category_parent)
  )
);
```

### 4.8 借用人名录

`GET /api/borrowers` 读取 `borrowers` 表，并联查当前在借产品与 `rental_history`：

- `total_count`：当前在借件数；
- `history_count`：历史流水次数；
- `items`：逐件在借明细；
- 没有在借器物的借用人仍然返回，卡片显示「当前没有在借器物」；
- 删除前服务端检查 `products.status = 'rented'`，有在借器物返回 `409`；
- 删除只移除名录行，历史流水保留。

前端在借用人页提供「添加借用人」弹窗、卡片删除按钮与禁用态提示；新增后重新拉取全部数据，确保借出下拉建议同步。

### 4.9 历史补录与删除

补录只创建**已完成**记录，避免与当前库存状态冲突：

- 关联现有产品时，产品名 / 品类取产品快照；
- 手动填写时使用输入的产品名与品类（品类为空则记为「手动补录」）；
- 必须提供出借日期与归还日期，且归还日期不得早于出借日期；
- 补录会自动把借用人登记进名录。

删除历史前检查 `status`：`rented` 记录返回 `409`，必须先走归还流程；`returned` 记录直接删除。前端在表格操作列只对已归还记录显示删除按钮，进行中记录显示「归还后可删除」。

### 4.10 模型库与外部 GLB

模型库由三部分组成：

- **内置模型**：56 个程序化 slug；从库中移除时写入 `hidden_models`，不删除几何代码，可在「已移除」恢复；
- **外部模型**：上传 `.glb`，校验 GLB 文件头与声明长度，保存到 `public/assets/models/uploads/`；文件上限 15 MB；
- **使用保护**：内置模型或外部模型仍有 `products.model_url` 引用时，删除 / 移除返回 `409`，避免产品展台失效。

前端「管理模型库」弹窗支持：

- 选择 GLB、可选命名、导入；
- 外部模型列表：使用、删除；
- 内置模型列表：使用、移除；
- 已移除列表：恢复。

外部模型使用 `GLTFLoader` 异步加载，加载完成后统一归一化尺寸、居中、落地，并保留原始材质；造型比例仍可调整，材质色调对内部模型生效，外部模型显示提示。加载失败时回退到通用座椅模型并提示用户。

---

## 5. 管理 API 汇总

| Method | Path | Body / Query |
| --- | --- | --- |
| `POST` | `/api/categories` | `{name, parent_id?}` |
| `PATCH` | `/api/categories/:id` | `{name}` |
| `DELETE` | `/api/categories/:id` | 可选 `?cascade=1` |
| `POST` | `/api/products` | `{name, category_id, quantity, model_key}` |
| `DELETE` | `/api/products/:id` | 删除在库产品；在借时拒绝，历史流水保留 |
| `PATCH` | `/api/products/:id/model` | `{model_key, scale_x/y/z, finish, seed, scope}` |
| `POST` | `/api/rentals/batch` | `{borrower, lend_date, product_ids}` |
| `POST` | `/api/rentals/return-batch` | `{return_date, rental_ids}` |
| `POST` | `/api/borrowers` | `{name, note?}` |
| `DELETE` | `/api/borrowers/:id` | 有在借器物时拒绝 |
| `POST` | `/api/history` | `{product_id? | product_name, category, borrower, lend_date, return_date}` |
| `DELETE` | `/api/history/:id` | 仅允许删除已归还记录 |
| `GET` | `/api/models` | 内置 / 外部 / 已移除模型及使用数 |
| `POST` | `/api/models/import` | `{name, filename, data}`，`data` 为 base64 GLB |
| `DELETE` | `/api/models/custom/:id` | 仍被产品使用时拒绝 |
| `POST` | `/api/models/hide` | `{key}`，移除未使用的内置模型 |
| `POST` | `/api/models/restore` | `{key}`，恢复内置模型 |

所有写操作都有服务端校验；批量借还使用事务；品类名称限制 30 字、产品名限制 80 字、借用人限制 40 字。

## 6. 验收

```bash
python tests/test_api.py
```

10 项测试全部通过，覆盖种子数据、四级品类树、聚合排序、大类 / 小类 / 三级 / 四级筛选、品类增删改、多件借出、批量归还、单件兼容接口、级联删除、单品删除与历史保留、3D 模型替换与批量应用，以及借用人增删、历史补录 / 删除、GLB 导入 / 删除、内置模型移除 / 恢复。

浏览器验收覆盖类目单击展开 / 再次点击缩回、空类目显示开关、器物列表左右滑动、借用人添加 / 删除、历史补录 / 删除、模型库 GLB 导入 / 删除、管理抽屉、行内改名、一次添加两件同款、同款数量加减、同一借用人两件同名器物、批量归还、模型工坊实时预览与保存、移动端断点与控制台零错误。截图见 [`previews/`](../previews/)。交互回归脚本为 `tools/verify_ui.mjs` 与 `tools/verify_features.mjs`。
