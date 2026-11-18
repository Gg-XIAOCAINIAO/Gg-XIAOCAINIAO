// 由 tools/dump_seed.py 自动生成，请勿手工修改；数据源见 server.py 的种子逻辑。
// categories=88 products=18 borrowers=6 history=42

export const SCHEMA_SQL = `-- 回声科技 · 产品借用
-- 当前状态 + 借还流水 + 四级品类 + 借用人名录 + 外部模型库

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
`;

export const SEED_SQL = `INSERT INTO categories (id, parent_id, name, sort_order) VALUES (1, NULL, '音频设备', 0);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (2, 1, '耳机', 0);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (3, 2, '半入耳式耳机', 0);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (4, 2, '蓝牙耳机', 1);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (5, 2, '耳夹式耳机', 2);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (6, 2, '挂耳式耳机', 3);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (7, 2, '骨传导耳机', 4);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (8, 2, '头戴降噪耳机', 5);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (9, 2, '头戴游戏耳机', 6);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (10, 2, '有线耳机', 7);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (11, 2, '其他耳机', 8);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (12, 1, '音响', 1);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (13, 1, '唱机', 2);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (14, NULL, '电脑外设', 1);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (15, 14, '键盘', 0);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (16, 15, '60 配列', 0);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (17, 15, '61 配列', 1);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (18, 15, '63 配列', 2);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (19, 15, '65 配列', 3);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (20, 15, '68 配列', 4);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (21, 15, '75 配列', 5);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (22, 15, '80 配列', 6);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (23, 15, '84 配列', 7);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (24, 15, '87 配列', 8);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (25, 15, '98 配列', 9);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (26, 15, '108 配列', 10);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (27, 15, '磁轴 / HE 键盘', 11);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (28, 15, '其他配列', 12);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (29, 14, '鼠标', 1);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (30, 29, '电竞鼠标', 0);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (31, 29, '小手 / Mini 款', 1);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (32, 29, '旗舰电竞款', 2);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (33, 14, '鼠标垫', 2);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (34, 14, '显示器', 3);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (35, 34, '27 寸 2K', 0);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (36, 34, '24/25 寸高刷', 1);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (37, 34, '34 寸带鱼屏', 2);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (38, 34, '32 寸 4K', 3);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (39, 14, '显示器支架', 4);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (40, 14, '游戏手柄', 5);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (41, 14, '移动硬盘', 6);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (42, NULL, '影像设备', 2);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (43, 42, '投影仪', 0);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (44, 42, '电视', 1);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (45, 42, '相机', 2);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (46, NULL, '数码配件', 3);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (47, 46, '充电宝', 0);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (48, 47, '大容量充电宝', 0);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (49, 47, '磁吸充电宝', 1);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (50, 46, '充电头', 1);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (51, 46, '手机散热器', 2);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (52, 46, '手机', 3);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (53, 46, '平板', 4);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (54, NULL, '清洁电器', 4);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (55, 54, '扫地机器人', 0);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (56, 54, '洗地机 / 吸尘器', 1);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (57, NULL, '健康个护', 5);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (58, 57, '电动牙刷', 0);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (59, 57, '刮胡刀', 1);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (60, 57, '血压计', 2);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (61, 57, '助听器', 3);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (62, 57, '按摩仪', 4);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (63, 57, '按摩椅', 5);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (64, NULL, '家居生活', 6);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (65, 64, '人体工学椅', 0);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (66, 65, '人体工学椅', 0);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (67, 65, '电竞椅', 1);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (68, 64, '升降桌', 1);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (69, 64, '冰箱', 2);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (70, 64, '空调', 3);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (71, 64, '行李箱', 4);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (72, 64, '服饰', 5);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (73, 64, '水杯', 6);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (74, 64, '休闲座椅', 7);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (75, 74, '休闲椅', 0);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (76, 74, '餐椅', 1);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (77, 74, '坐凳', 2);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (78, 64, '桌几', 8);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (79, 78, '茶几', 0);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (80, 78, '边几', 1);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (81, 64, '灯具', 9);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (82, 81, '台灯', 0);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (83, 81, '落地灯', 1);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (84, NULL, '运动健身', 7);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (85, 84, '跑步机', 0);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (86, NULL, '网络服务', 8);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (87, 86, '路由器', 0);
INSERT INTO categories (id, parent_id, name, sort_order) VALUES (88, 86, '宽带', 1);
INSERT INTO products (id, category_id, category, name, model_url, status, current_borrower, current_lend_date) VALUES (1, 75, '休闲椅', '云栖休闲椅', '/assets/models/lounge-chair.glb', 'rented', '陈知遥', '2026-11-11');
INSERT INTO products (id, category_id, category, name, model_url, status, current_borrower, current_lend_date) VALUES (2, 76, '餐椅', '榉木餐椅', '/assets/models/dining-chair.glb', 'in_stock', NULL, NULL);
INSERT INTO products (id, category_id, category, name, model_url, status, current_borrower, current_lend_date) VALUES (3, 77, '坐凳', '苔原矮凳', '/assets/models/stool.glb', 'in_stock', NULL, NULL);
INSERT INTO products (id, category_id, category, name, model_url, status, current_borrower, current_lend_date) VALUES (4, 82, '台灯', '暖白台灯', '/assets/models/table-lamp.glb', 'rented', '林予安', '2026-10-31');
INSERT INTO products (id, category_id, category, name, model_url, status, current_borrower, current_lend_date) VALUES (5, 83, '落地灯', '弧光落地灯', '/assets/models/floor-lamp.glb', 'in_stock', NULL, NULL);
INSERT INTO products (id, category_id, category, name, model_url, status, current_borrower, current_lend_date) VALUES (6, 12, '音响', '胡桃木音箱', '/assets/models/speaker.glb', 'rented', '周叙', '2026-11-15');
INSERT INTO products (id, category_id, category, name, model_url, status, current_borrower, current_lend_date) VALUES (7, 13, '唱机', '黑胶唱机', '/assets/models/turntable.glb', 'rented', '林予安', '2026-11-06');
INSERT INTO products (id, category_id, category, name, model_url, status, current_borrower, current_lend_date) VALUES (8, 45, '相机', '复古数码相机', '/assets/models/camera.glb', 'rented', '陈知遥', '2026-10-28');
INSERT INTO products (id, category_id, category, name, model_url, status, current_borrower, current_lend_date) VALUES (9, 43, '投影仪', '便携投影仪', '/assets/models/projector.glb', 'rented', '苏晚', '2026-10-20');
INSERT INTO products (id, category_id, category, name, model_url, status, current_borrower, current_lend_date) VALUES (10, 79, '茶几', '低矮茶几', '/assets/models/coffee-table.glb', 'in_stock', NULL, NULL);
INSERT INTO products (id, category_id, category, name, model_url, status, current_borrower, current_lend_date) VALUES (11, 80, '边几', '砂岩边几', '/assets/models/side-table.glb', 'rented', '苏晚', '2026-11-09');
INSERT INTO products (id, category_id, category, name, model_url, status, current_borrower, current_lend_date) VALUES (12, 75, '休闲椅', '亚麻双人椅', '/assets/models/loveseat.glb', 'rented', '陈知遥', '2026-11-04');
INSERT INTO products (id, category_id, category, name, model_url, status, current_borrower, current_lend_date) VALUES (13, 4, '蓝牙耳机', '回声 Air 蓝牙耳机', '/assets/models/wireless-earbuds.glb', 'rented', '陈知遥', '2026-11-13');
INSERT INTO products (id, category_id, category, name, model_url, status, current_borrower, current_lend_date) VALUES (14, 4, '蓝牙耳机', '回声 Air 蓝牙耳机', '/assets/models/wireless-earbuds.glb', 'rented', '陈知遥', '2026-11-16');
INSERT INTO products (id, category_id, category, name, model_url, status, current_borrower, current_lend_date) VALUES (15, 10, '有线耳机', '回声 Wire 有线耳机', '/assets/models/wired-earbuds.glb', 'in_stock', NULL, NULL);
INSERT INTO products (id, category_id, category, name, model_url, status, current_borrower, current_lend_date) VALUES (16, 9, '头戴游戏耳机', '回声 Game 游戏耳机', '/assets/models/gaming-headphones.glb', 'rented', '苏晚', '2026-11-14');
INSERT INTO products (id, category_id, category, name, model_url, status, current_borrower, current_lend_date) VALUES (17, 8, '头戴降噪耳机', '回声 Quiet 降噪耳机', '/assets/models/anc-headphones.glb', 'rented', '林予安', '2026-11-10');
INSERT INTO products (id, category_id, category, name, model_url, status, current_borrower, current_lend_date) VALUES (18, 8, '头戴降噪耳机', '回声 Studio 降噪耳机', '/assets/models/anc-headphones.glb', 'in_stock', NULL, NULL);
INSERT INTO borrowers (id, name, note, created_at) VALUES (1, '周叙', '', '2026-11-18 22:27:49');
INSERT INTO borrowers (id, name, note, created_at) VALUES (2, '林予安', '', '2026-11-18 22:27:49');
INSERT INTO borrowers (id, name, note, created_at) VALUES (3, '沈叙白', '', '2026-11-18 22:27:49');
INSERT INTO borrowers (id, name, note, created_at) VALUES (4, '苏晚', '', '2026-11-18 22:27:49');
INSERT INTO borrowers (id, name, note, created_at) VALUES (5, '陈知遥', '', '2026-11-18 22:27:49');
INSERT INTO borrowers (id, name, note, created_at) VALUES (6, '顾清和', '', '2026-11-18 22:27:49');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (1, 1, '云栖休闲椅', '休闲椅', '陈知遥', '2026-11-11', NULL, 'rented');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (2, 4, '暖白台灯', '台灯', '林予安', '2026-10-31', NULL, 'rented');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (3, 6, '胡桃木音箱', '音响', '周叙', '2026-11-15', NULL, 'rented');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (4, 7, '黑胶唱机', '唱机', '林予安', '2026-11-06', NULL, 'rented');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (5, 8, '复古数码相机', '相机', '陈知遥', '2026-10-28', NULL, 'rented');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (6, 9, '便携投影仪', '投影仪', '苏晚', '2026-10-20', NULL, 'rented');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (7, 11, '砂岩边几', '边几', '苏晚', '2026-11-09', NULL, 'rented');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (8, 12, '亚麻双人椅', '休闲椅', '陈知遥', '2026-11-04', NULL, 'rented');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (9, 13, '回声 Air 蓝牙耳机', '蓝牙耳机', '陈知遥', '2026-11-13', NULL, 'rented');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (10, 14, '回声 Air 蓝牙耳机', '蓝牙耳机', '陈知遥', '2026-11-16', NULL, 'rented');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (11, 16, '回声 Game 游戏耳机', '头戴游戏耳机', '苏晚', '2026-11-14', NULL, 'rented');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (12, 17, '回声 Quiet 降噪耳机', '头戴降噪耳机', '林予安', '2026-11-10', NULL, 'rented');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (13, 1, '云栖休闲椅', '休闲椅', '沈叙白', '2026-08-06', '2026-08-23', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (14, 2, '榉木餐椅', '餐椅', '顾清和', '2026-08-11', '2026-08-28', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (15, 3, '苔原矮凳', '坐凳', '苏晚', '2026-08-15', '2026-08-22', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (16, 4, '暖白台灯', '台灯', '陈知遥', '2026-08-20', '2026-09-09', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (17, 5, '弧光落地灯', '落地灯', '林予安', '2026-08-24', '2026-09-13', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (18, 6, '胡桃木音箱', '音响', '周叙', '2026-08-27', '2026-09-15', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (19, 7, '黑胶唱机', '唱机', '顾清和', '2026-08-31', '2026-09-18', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (20, 8, '复古数码相机', '相机', '沈叙白', '2026-09-03', '2026-09-20', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (21, 9, '便携投影仪', '投影仪', '苏晚', '2026-09-06', '2026-09-24', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (22, 10, '低矮茶几', '茶几', '陈知遥', '2026-09-10', '2026-09-27', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (23, 11, '砂岩边几', '边几', '林予安', '2026-09-13', '2026-10-01', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (24, 12, '亚麻双人椅', '休闲椅', '周叙', '2026-09-16', '2026-10-04', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (25, 1, '云栖休闲椅', '休闲椅', '顾清和', '2026-09-21', '2026-10-09', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (26, 2, '榉木餐椅', '餐椅', '沈叙白', '2026-09-24', '2026-10-11', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (27, 3, '苔原矮凳', '坐凳', '陈知遥', '2026-09-28', '2026-10-16', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (28, 4, '暖白台灯', '台灯', '林予安', '2026-10-01', '2026-10-18', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (29, 5, '弧光落地灯', '落地灯', '周叙', '2026-10-05', '2026-10-21', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (30, 6, '胡桃木音箱', '音响', '苏晚', '2026-10-08', '2026-10-24', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (31, 7, '黑胶唱机', '唱机', '沈叙白', '2026-10-12', '2026-10-28', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (32, 8, '复古数码相机', '相机', '顾清和', '2026-10-15', '2026-10-30', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (33, 9, '便携投影仪', '投影仪', '林予安', '2026-10-19', '2026-11-03', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (34, 10, '低矮茶几', '茶几', '周叙', '2026-10-22', '2026-11-06', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (35, 11, '砂岩边几', '边几', '陈知遥', '2026-10-26', '2026-11-09', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (36, 12, '亚麻双人椅', '休闲椅', '苏晚', '2026-10-30', '2026-11-12', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (37, 2, '榉木餐椅', '餐椅', '顾清和', '2026-11-04', '2026-11-14', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (38, 5, '弧光落地灯', '落地灯', '沈叙白', '2026-11-10', '2026-11-16', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (39, 14, '回声 Air 蓝牙耳机', '蓝牙耳机', '沈叙白', '2026-11-06', '2026-11-15', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (40, 16, '回声 Game 游戏耳机', '头戴游戏耳机', '顾清和', '2026-10-26', '2026-11-07', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (41, 17, '回声 Quiet 降噪耳机', '头戴降噪耳机', '周叙', '2026-10-16', '2026-10-29', 'returned');
INSERT INTO rental_history (id, product_id, product_name, category, borrower, lend_date, return_date, status) VALUES (42, 15, '回声 Wire 有线耳机', '有线耳机', '陈知遥', '2026-10-08', '2026-10-19', 'returned');
`;
