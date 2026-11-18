-- 回声科技 · 产品借用
-- 当前状态 + 借还流水 + 四级品类 + 借用人名录 + 外部模型库
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id   INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
    name        TEXT    NOT NULL CHECK (TRIM(name) <> ''),
    sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_root_name
    ON categories(name COLLATE NOCASE)
    WHERE parent_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_child_name
    ON categories(parent_id, name COLLATE NOCASE)
    WHERE parent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS products (
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
        OR
        (status = 'rented' AND current_borrower IS NOT NULL AND current_lend_date IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS rental_history (
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

CREATE INDEX IF NOT EXISTS idx_products_status
    ON products(status, current_borrower);

CREATE INDEX IF NOT EXISTS idx_history_borrower
    ON rental_history(borrower, lend_date);

CREATE INDEX IF NOT EXISTS idx_history_category
    ON rental_history(category, lend_date);

CREATE INDEX IF NOT EXISTS idx_history_lend_date
    ON rental_history(lend_date DESC);

CREATE INDEX IF NOT EXISTS idx_history_active
    ON rental_history(product_id, status);

-- 借用人目录：即使没有在借器物，也可以单独登记、展示和删除。
CREATE TABLE IF NOT EXISTS borrowers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL COLLATE NOCASE UNIQUE,
    note        TEXT    NOT NULL DEFAULT '',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 外部导入的 GLB 模型；model_key 会写入 products.model_url。
CREATE TABLE IF NOT EXISTS custom_models (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    model_key      TEXT    NOT NULL UNIQUE,
    name           TEXT    NOT NULL,
    file_name      TEXT    NOT NULL UNIQUE,
    original_name  TEXT    NOT NULL DEFAULT '',
    size_bytes     INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 从模型库移除的内置模型；产品仍在使用时服务端会拒绝隐藏。
CREATE TABLE IF NOT EXISTS hidden_models (
    model_key  TEXT PRIMARY KEY,
    hidden_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

