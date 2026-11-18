#!/usr/bin/env python3
"""端到端验收：启动临时数据库上的服务，检查页面、品类管理、聚合、多件借还。"""

from __future__ import annotations

import base64
import json
import os
import shutil
import socket
import sqlite3
import struct
import subprocess
import sys
import time
import unittest
import urllib.error
import urllib.parse
import urllib.request
from contextlib import closing
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SERVER = ROOT / "server.py"
TODAY = date.today()


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def find_category(nodes: list[dict], name: str) -> dict | None:
    for node in nodes:
        if node["name"] == name:
            return node
        found = find_category(node.get("children", []), name)
        if found:
            return found
    return None


def make_box_glb() -> bytes:
    points = [
        (-0.5, 0, -0.5), (0.5, 0, -0.5), (0.5, 0, 0.5), (-0.5, 0, 0.5),
        (-0.5, 1, -0.5), (0.5, 1, -0.5), (0.5, 1, 0.5), (-0.5, 1, 0.5),
    ]
    indices = [
        0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1,
        1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0,
    ]
    positions = b"".join(struct.pack("<3f", *point) for point in points)
    binary = positions + b"".join(struct.pack("<H", index) for index in indices)
    document = {
        "asset": {"version": "2.0", "generator": "echo-test"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "Test Box"}],
        "meshes": [{"primitives": [{"attributes": {"POSITION": 0}, "indices": 1, "material": 0}]}],
        "materials": [{"pbrMetallicRoughness": {
            "baseColorFactor": [0.72, 0.62, 0.52, 1],
            "metallicFactor": 0.05,
            "roughnessFactor": 0.8,
        }}],
        "buffers": [{"byteLength": len(binary)}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": len(positions), "target": 34962},
            {"buffer": 0, "byteOffset": len(positions), "byteLength": len(binary) - len(positions), "target": 34963},
        ],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": 8, "type": "VEC3",
             "min": [-0.5, 0, -0.5], "max": [0.5, 1, 0.5]},
            {"bufferView": 1, "componentType": 5123, "count": 36, "type": "SCALAR"},
        ],
    }
    json_bytes = json.dumps(document, separators=(",", ":")).encode("utf-8")
    json_bytes += b" " * ((4 - len(json_bytes) % 4) % 4)
    binary += b"\0" * ((4 - len(binary) % 4) % 4)
    total = 12 + 8 + len(json_bytes) + 8 + len(binary)
    return (
        struct.pack("<III", 0x46546C67, 2, total)
        + struct.pack("<II", len(json_bytes), 0x4E4F534A)
        + json_bytes
        + struct.pack("<II", len(binary), 0x004E4942)
        + binary
    )


class RentalApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.tempdir = ROOT / "tests" / f"_tmp_{os.getpid()}"
        cls.tempdir.mkdir(parents=True, exist_ok=True)
        cls.port = free_port()
        cls.base = f"http://127.0.0.1:{cls.port}"
        cls.db = cls.tempdir / "test.db"
        cls.process = subprocess.Popen(
            [
                sys.executable,
                str(SERVER),
                "--host",
                "127.0.0.1",
                "--port",
                str(cls.port),
                "--db",
                str(cls.db),
            ],
            cwd=ROOT,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )
        deadline = time.time() + 15
        while time.time() < deadline:
            try:
                status, _ = cls.request("GET", "/api/health")
                if status == 200:
                    return
            except OSError:
                time.sleep(0.15)
        stderr = cls.process.stderr.read().decode("utf-8", "replace") if cls.process.stderr else ""
        raise RuntimeError(f"测试服务未能启动：{stderr}")

    @classmethod
    def tearDownClass(cls) -> None:
        cls.process.kill()
        try:
            cls.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            pass
        for _ in range(5):
            try:
                shutil.rmtree(cls.tempdir)
                break
            except FileNotFoundError:
                break
            except PermissionError:
                time.sleep(0.25)

    @classmethod
    def request(cls, method: str, path: str, payload: dict | None = None):
        data = None
        headers = {}
        if payload is not None:
            data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            headers["Content-Type"] = "application/json"
        request = urllib.request.Request(cls.base + path, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                body = response.read()
                if response.headers.get_content_type() == "application/json":
                    return response.status, json.loads(body)
                return response.status, body.decode("utf-8", "replace")
        except urllib.error.HTTPError as error:
            body = error.read()
            return error.code, json.loads(body)

    def test_01_static_page_and_seed(self) -> None:
        status, html = self.request("GET", "/")
        self.assertEqual(status, 200)
        self.assertIn("回声科技", html)
        self.assertIn("滚滚小菜鸟 著", html)
        self.assertIn("登记借出", html)
        self.assertIn("品类与产品", html)

        status, products = self.request("GET", "/api/products")
        self.assertEqual(status, 200)
        self.assertEqual(len(products), 18)
        self.assertEqual(sum(1 for product in products if product["status"] == "rented"), 12)
        self.assertTrue(all(product["asset_code"].startswith("P") for product in products))
        self.assertTrue(any(product["category_path"] == "音频设备 / 耳机 / 蓝牙耳机" for product in products))

        status, categories = self.request("GET", "/api/categories")
        self.assertEqual(status, 200)
        self.assertEqual(
            [root["name"] for root in categories],
            ["音频设备", "电脑外设", "影像设备", "数码配件", "清洁电器", "健康个护", "家居生活", "运动健身", "网络服务"],
        )
        earphones = find_category(categories, "耳机")
        self.assertIsNotNone(earphones)
        self.assertEqual(earphones["depth"], 2)
        self.assertEqual(earphones["product_count"], 6)
        self.assertEqual(
            [child["name"] for child in earphones["children"]],
            ["半入耳式耳机", "蓝牙耳机", "耳夹式耳机", "挂耳式耳机", "骨传导耳机", "头戴降噪耳机", "头戴游戏耳机", "有线耳机", "其他耳机"],
        )
        self.assertIsNotNone(find_category(categories, "键盘"))
        self.assertIsNotNone(find_category(categories, "磁轴 / HE 键盘"))
        self.assertIsNotNone(find_category(categories, "按摩椅"))
        self.assertIsNotNone(find_category(categories, "宽带"))

        status, history = self.request("GET", "/api/history")
        self.assertEqual(status, 200)
        self.assertEqual(len(history), 42)
        self.assertEqual(sum(1 for record in history if record["status"] == "rented"), 12)

    def test_02_borrower_aggregation(self) -> None:
        status, borrowers = self.request("GET", "/api/borrowers")
        self.assertEqual(status, 200)
        self.assertEqual([row["total_count"] for row in borrowers], [5, 3, 3, 1, 0, 0])
        self.assertEqual(
            [row["borrower"] for row in borrowers],
            ["陈知遥", "林予安", "苏晚", "周叙", "沈叙白", "顾清和"],
        )

        chen = borrowers[0]
        self.assertEqual(len(chen["items"]), 5)
        self.assertGreaterEqual(chen["history_count"], 5)
        bluetooth_items = [item for item in chen["items"] if item["product_name"] == "回声 Air 蓝牙耳机"]
        self.assertEqual(len(bluetooth_items), 2)
        self.assertIn("asset_code", bluetooth_items[0])
        self.assertEqual(bluetooth_items[0]["category_path"], "音频设备 / 耳机 / 蓝牙耳机")
        self.assertIn("days_borrowed", bluetooth_items[0])

        idle = [row for row in borrowers if row["total_count"] == 0]
        self.assertEqual({row["borrower"] for row in idle}, {"沈叙白", "顾清和"})
        self.assertTrue(all(row["items"] == [] for row in idle))

    def test_03_history_filters(self) -> None:
        status, categories = self.request("GET", "/api/categories")
        audio = find_category(categories, "音频设备")
        earphones = find_category(categories, "耳机")
        anc = find_category(categories, "头戴降噪耳机")
        self.assertIsNotNone(audio)
        self.assertIsNotNone(earphones)
        self.assertIsNotNone(anc)

        status, records = self.request("GET", f"/api/history?category_id={earphones['id']}")
        self.assertEqual(status, 200)
        self.assertTrue(records)
        self.assertTrue(all(record["category"] in {
            "半入耳式耳机", "蓝牙耳机", "耳夹式耳机", "挂耳式耳机", "骨传导耳机",
            "头戴降噪耳机", "头戴游戏耳机", "有线耳机", "其他耳机",
        } for record in records))

        status, records = self.request("GET", f"/api/history?category_id={anc['id']}")
        self.assertEqual(status, 200)
        self.assertTrue(records)
        self.assertTrue(all(record["category"] == "头戴降噪耳机" for record in records))

        status, records = self.request("GET", f"/api/history?category_id={audio['id']}")
        self.assertEqual(status, 200)
        self.assertTrue(records)
        self.assertTrue(all(record["category"] in {
            "半入耳式耳机", "蓝牙耳机", "耳夹式耳机", "挂耳式耳机", "骨传导耳机",
            "头戴降噪耳机", "头戴游戏耳机", "有线耳机", "其他耳机", "音响", "唱机",
        } for record in records))

        date_from = (TODAY - timedelta(days=30)).isoformat()
        query = urllib.parse.urlencode({"from": date_from, "to": TODAY.isoformat()})
        status, records = self.request("GET", f"/api/history?{query}")
        self.assertEqual(status, 200)
        self.assertTrue(records)
        self.assertTrue(all(date_from <= record["lend_date"] <= TODAY.isoformat() for record in records))

        status, records = self.request("GET", "/api/history?q=%E9%99%8D%E5%99%AA")
        self.assertEqual(status, 200)
        self.assertTrue(records)
        self.assertTrue(all("降噪" in record["product_name"] for record in records))

        status, payload = self.request("GET", "/api/history?from=2026-12-01&to=2026-11-01")
        self.assertEqual(status, 400)
        self.assertIn("开始日期", payload["error"])

        status, payload = self.request("DELETE", f"/api/categories/{earphones['id']}?cascade=1")
        self.assertEqual(status, 409)
        self.assertIn("在借", payload["error"])

    def test_04_category_admin_and_batch_rent(self) -> None:
        status, root = self.request("POST", "/api/categories", {"name": "测试大类"})
        self.assertEqual(status, 201)
        root_id = root["id"]

        status, child = self.request(
            "POST", "/api/categories", {"name": "测试小类", "parent_id": root_id}
        )
        self.assertEqual(status, 201)
        child_id = child["id"]

        status, renamed = self.request(
            "PATCH", f"/api/categories/{child_id}", {"name": "测试小类改名"}
        )
        self.assertEqual(status, 200)
        self.assertEqual(renamed["name"], "测试小类改名")

        status, payload = self.request("DELETE", f"/api/categories/{root_id}")
        self.assertEqual(status, 409)
        self.assertIn("子品类", payload["error"])

        status, empty = self.request("POST", "/api/categories", {"name": "临时空类"})
        self.assertEqual(status, 201)
        status, deleted = self.request("DELETE", f"/api/categories/{empty['id']}")
        self.assertEqual(status, 200)
        self.assertTrue(deleted["ok"])

        status, created = self.request(
            "POST",
            "/api/products",
            {
                "name": "测试同款耳机",
                "category_id": child_id,
                "quantity": 2,
                "model_key": "wireless-earbuds",
            },
        )
        self.assertEqual(status, 201)
        self.assertEqual(len(created), 2)
        self.assertEqual({item["name"] for item in created}, {"测试同款耳机"})
        self.assertEqual({item["category_path"] for item in created}, {"测试大类 / 测试小类改名"})
        self.assertEqual(len({item["asset_code"] for item in created}), 2)
        product_ids = [item["id"] for item in created]

        status, payload = self.request("DELETE", f"/api/categories/{child_id}")
        self.assertEqual(status, 409)
        self.assertIn("产品", payload["error"])

        status, rented = self.request(
            "POST",
            "/api/rentals/batch",
            {
                "borrower": "多件测试",
                "lend_date": (TODAY - timedelta(days=1)).isoformat(),
                "product_ids": product_ids,
            },
        )
        self.assertEqual(status, 201)
        self.assertEqual(len(rented["rentals"]), 2)
        self.assertEqual({product["status"] for product in rented["products"]}, {"rented"})
        rental_ids = [item["id"] for item in rented["rentals"]]

        status, borrowers = self.request("GET", "/api/borrowers")
        row = next(item for item in borrowers if item["borrower"] == "多件测试")
        self.assertEqual(row["total_count"], 2)
        self.assertEqual([item["product_name"] for item in row["items"]], ["测试同款耳机", "测试同款耳机"])

        status, payload = self.request(
            "POST",
            "/api/rentals/batch",
            {
                "borrower": "另一位",
                "lend_date": TODAY.isoformat(),
                "product_ids": product_ids,
            },
        )
        self.assertEqual(status, 409)

        status, returned = self.request(
            "POST",
            "/api/rentals/return-batch",
            {"return_date": TODAY.isoformat(), "rental_ids": rental_ids},
        )
        self.assertEqual(status, 200)
        self.assertEqual({item["status"] for item in returned["rentals"]}, {"returned"})
        self.assertEqual({product["status"] for product in returned["products"]}, {"in_stock"})

        status, borrowers = self.request("GET", "/api/borrowers")
        self.assertTrue(any(item["borrower"] == "多件测试" and item["total_count"] == 0 for item in borrowers))

        status, payload = self.request(
            "POST",
            "/api/rentals/return-batch",
            {"return_date": TODAY.isoformat(), "rental_ids": rental_ids},
        )
        self.assertEqual(status, 409)
        self.assertIn("已归还", payload["error"])

        status, deleted = self.request("DELETE", f"/api/categories/{child_id}?cascade=1")
        self.assertEqual(status, 200)
        self.assertEqual(deleted["deleted_products"], 2)

        status, records = self.request(
            "GET",
            f"/api/history?q={urllib.parse.quote('测试同款耳机')}",
        )
        self.assertEqual(status, 200)
        self.assertEqual(len(records), 2)
        self.assertTrue(all(record["product_name"] == "测试同款耳机" for record in records))
        self.assertTrue(all(record["product_id"] is None for record in records))

        status, deleted_root = self.request("DELETE", f"/api/categories/{root_id}?cascade=1")
        self.assertEqual(status, 200)
        self.assertEqual(deleted_root["deleted_products"], 0)

    def test_05_single_endpoints_and_validation(self) -> None:
        status, products = self.request("GET", "/api/products")
        available = next(item for item in products if item["status"] == "in_stock")
        lend_date = (TODAY - timedelta(days=4)).isoformat()

        status, payload = self.request(
            "POST",
            "/api/rentals",
            {"product_id": available["id"], "borrower": "", "lend_date": lend_date},
        )
        self.assertEqual(status, 400)

        status, payload = self.request(
            "POST",
            "/api/rentals",
            {"product_id": available["id"], "borrower": "单人测试", "lend_date": "2026/11/12"},
        )
        self.assertEqual(status, 400)
        self.assertIn("YYYY-MM-DD", payload["error"])

        status, rental = self.request(
            "POST",
            "/api/rentals",
            {"product_id": available["id"], "borrower": "单人测试", "lend_date": lend_date},
        )
        self.assertEqual(status, 201)
        rental_id = rental["rental"]["id"]

        status, returned = self.request(
            "POST",
            f"/api/rentals/{rental_id}/return",
            {"return_date": TODAY.isoformat()},
        )
        self.assertEqual(status, 200)
        self.assertEqual(returned["product"]["status"], "in_stock")

        status, payload = self.request(
            "POST",
            "/api/rentals",
            {"product_id": 99999, "borrower": "无人", "lend_date": lend_date},
        )
        self.assertEqual(status, 404)

        status, payload = self.request(
            "POST",
            "/api/products",
            {"name": "错误产品", "category_id": 99999, "quantity": 1, "model_key": "stool"},
        )
        self.assertEqual(status, 404)

    def test_06_history_survives_product_delete(self) -> None:
        status, products = self.request("GET", "/api/products")
        self.assertEqual(status, 200)
        product = next(item for item in products if item["name"] == "榉木餐椅")

        with closing(sqlite3.connect(self.db)) as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            conn.execute("DELETE FROM products WHERE id = ?", (product["id"],))
            conn.commit()

        status, records = self.request(
            "GET",
            f"/api/history?q={urllib.parse.quote('榉木餐椅')}",
        )
        self.assertEqual(status, 200)
        self.assertTrue(records)
        self.assertTrue(all(record["product_name"] == "榉木餐椅" for record in records))
        self.assertTrue(all(record["product_id"] is None for record in records))

    def test_07_model_studio_update(self) -> None:
        status, products = self.request("GET", "/api/products")
        self.assertEqual(status, 200)
        product = next(item for item in products if item["name"] == "云栖休闲椅")

        status, result = self.request(
            "PATCH",
            f"/api/products/{product['id']}/model",
            {
                "model_key": "office-chair",
                "scale_x": 1.1,
                "scale_y": 0.95,
                "scale_z": 1,
                "finish": "clay",
                "scope": "current",
            },
        )
        self.assertEqual(status, 200)
        self.assertEqual(result["updated"], 1)
        self.assertIn("office-chair", result["model_url"])
        self.assertIn("finish=clay", result["model_url"])
        self.assertIn("sx=1.1", result["model_url"])

        status, updated_products = self.request("GET", "/api/products")
        changed = next(item for item in updated_products if item["id"] == product["id"])
        self.assertIn("office-chair", changed["model_url"])

        # 同小类批量应用
        status, result = self.request(
            "PATCH",
            f"/api/products/{product['id']}/model",
            {
                "model_key": "lounge-chair",
                "scale_x": 1,
                "scale_y": 1,
                "scale_z": 1,
                "finish": "default",
                "scope": "category",
            },
        )
        self.assertEqual(status, 200)
        self.assertEqual(result["updated"], 2)
        self.assertTrue(all(item["model_url"] == "/assets/models/lounge-chair.glb"
                            for item in result["products"]))

        status, payload = self.request(
            "PATCH",
            f"/api/products/{product['id']}/model",
            {"model_key": "not-a-model", "scope": "current"},
        )
        self.assertEqual(status, 400)
        self.assertIn("模型", payload["error"])

        status, generated = self.request(
            "PATCH",
            f"/api/products/{product['id']}/model",
            {
                "model_key": "generated",
                "seed": 12345,
                "scale_x": 1,
                "scale_y": 1,
                "scale_z": 1,
                "finish": "sage",
                "scope": "current",
            },
        )
        self.assertEqual(status, 200)
        self.assertIn("generated", generated["model_url"])
        self.assertIn("seed=12345", generated["model_url"])

    def test_08_four_level_categories(self) -> None:
        status, level_one = self.request("POST", "/api/categories", {"name": "层级一级"})
        self.assertEqual(status, 201)
        status, level_two = self.request(
            "POST", "/api/categories", {"name": "层级二级", "parent_id": level_one["id"]}
        )
        self.assertEqual(status, 201)
        status, level_three = self.request(
            "POST", "/api/categories", {"name": "层级三级", "parent_id": level_two["id"]}
        )
        self.assertEqual(status, 201)
        status, level_four = self.request(
            "POST", "/api/categories", {"name": "层级四级", "parent_id": level_three["id"]}
        )
        self.assertEqual(status, 201)

        status, payload = self.request(
            "POST", "/api/categories", {"name": "层级五级", "parent_id": level_four["id"]}
        )
        self.assertEqual(status, 400)
        self.assertIn("四级", payload["error"])

        status, created = self.request(
            "POST",
            "/api/products",
            {
                "name": "四级分类产品",
                "category_id": level_four["id"],
                "quantity": 1,
                "model_key": "generated",
            },
        )
        self.assertEqual(status, 201)
        self.assertEqual(created[0]["category_path"], "层级一级 / 层级二级 / 层级三级 / 层级四级")

        status, categories = self.request("GET", "/api/categories")
        root = next(item for item in categories if item["name"] == "层级一级")
        self.assertEqual(root["depth"], 1)
        self.assertEqual(root["children"][0]["children"][0]["children"][0]["depth"], 4)

        product_id = created[0]["id"]
        status, rental = self.request(
            "POST",
            "/api/rentals",
            {
                "product_id": product_id,
                "borrower": "四级测试",
                "lend_date": (TODAY - timedelta(days=2)).isoformat(),
            },
        )
        self.assertEqual(status, 201)
        status, returned = self.request(
            "POST",
            f"/api/rentals/{rental['rental']['id']}/return",
            {"return_date": (TODAY - timedelta(days=1)).isoformat()},
        )
        self.assertEqual(status, 200)

        status, records = self.request(
            "GET", f"/api/history?category_id={level_one['id']}"
        )
        self.assertEqual(status, 200)
        self.assertTrue(any(record["product_name"] == "四级分类产品" for record in records))

        status, deleted = self.request(
            "DELETE", f"/api/categories/{level_one['id']}?cascade=1"
        )
        self.assertEqual(status, 200)
        self.assertEqual(deleted["deleted_products"], 1)

        status, records = self.request(
            "GET",
            f"/api/history?q={urllib.parse.quote('四级分类产品')}",
        )
        self.assertEqual(status, 200)
        self.assertTrue(records)

    def test_09_borrower_history_and_model_library(self) -> None:
        status, borrowers = self.request("GET", "/api/borrowers")
        self.assertEqual(status, 200)
        chen = next(row for row in borrowers if row["borrower"] == "陈知遥")
        status, payload = self.request("DELETE", f"/api/borrowers/{chen['id']}")
        self.assertEqual(status, 409)
        self.assertIn("在借", payload["error"])

        status, created = self.request(
            "POST", "/api/borrowers", {"name": "验收借用人", "note": "目录测试"}
        )
        self.assertEqual(status, 201)
        self.assertEqual(created["note"], "目录测试")
        status, duplicate = self.request("POST", "/api/borrowers", {"name": "验收借用人"})
        self.assertEqual(status, 409)

        status, record = self.request(
            "POST",
            "/api/history",
            {
                "product_name": "旧款相机",
                "category": "相机",
                "borrower": "验收借用人",
                "lend_date": (TODAY - timedelta(days=9)).isoformat(),
                "return_date": (TODAY - timedelta(days=3)).isoformat(),
            },
        )
        self.assertEqual(status, 201)
        self.assertEqual(record["status"], "returned")
        self.assertIsNone(record["product_id"])

        status, removed = self.request("DELETE", f"/api/borrowers/{created['id']}")
        self.assertEqual(status, 200)
        self.assertEqual(removed["history_preserved"], 1)

        status, records = self.request(
            "GET", f"/api/history?q={urllib.parse.quote('旧款相机')}"
        )
        self.assertEqual(status, 200)
        self.assertEqual(len(records), 1)
        status, deleted = self.request("DELETE", f"/api/history/{record['id']}")
        self.assertEqual(status, 200)
        status, _ = self.request("DELETE", f"/api/history/{record['id']}")
        self.assertEqual(status, 404)

        status, products = self.request("GET", "/api/products")
        product = next(item for item in products if item["status"] == "in_stock")
        status, linked = self.request(
            "POST",
            "/api/history",
            {
                "product_id": product["id"],
                "borrower": "验收借用人",
                "lend_date": (TODAY - timedelta(days=5)).isoformat(),
                "return_date": (TODAY - timedelta(days=1)).isoformat(),
            },
        )
        self.assertEqual(status, 201)
        self.assertEqual(linked["product_name"], product["name"])
        status, _ = self.request("DELETE", f"/api/history/{linked['id']}")
        self.assertEqual(status, 200)

        status, library = self.request("GET", "/api/models")
        self.assertEqual(status, 200)
        self.assertEqual(len(library["builtin"]), 56)
        status, payload = self.request(
            "POST", "/api/models/hide", {"key": "camera"}
        )
        self.assertEqual(status, 409)
        self.assertIn("产品", payload["error"])
        status, _ = self.request("POST", "/api/models/hide", {"key": "vessel"})
        self.assertEqual(status, 200)
        status, library = self.request("GET", "/api/models")
        self.assertIn("vessel", library["hidden"])
        status, _ = self.request("POST", "/api/models/restore", {"key": "vessel"})
        self.assertEqual(status, 200)

        glb = make_box_glb()
        status, imported = self.request(
            "POST",
            "/api/models/import",
            {
                "name": "验收方块",
                "filename": "acceptance-box.glb",
                "data": base64.b64encode(glb).decode("ascii"),
            },
        )
        self.assertEqual(status, 201)
        self.assertTrue(imported["key"].startswith("custom-"))
        with urllib.request.urlopen(self.base + imported["url"], timeout=10) as response:
            self.assertEqual(response.status, 200)
            self.assertEqual(response.read()[:4], b"glTF")

        status, updated = self.request(
            "PATCH",
            f"/api/products/{product['id']}/model",
            {"model_key": imported["key"], "scope": "current"},
        )
        self.assertEqual(status, 200)
        self.assertIn(imported["url"], updated["model_url"])
        status, payload = self.request(
            "DELETE", f"/api/models/custom/{imported['id']}"
        )
        self.assertEqual(status, 409)
        self.assertIn("产品", payload["error"])

        status, _ = self.request(
            "PATCH",
            f"/api/products/{product['id']}/model",
            {"model_key": "lounge-chair", "scope": "current"},
        )
        self.assertEqual(status, 200)
        status, _ = self.request("DELETE", f"/api/models/custom/{imported['id']}")
        self.assertEqual(status, 200)
        status, library = self.request("GET", "/api/models")
        self.assertEqual(library["custom"], [])
        with self.assertRaises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(self.base + imported["url"], timeout=10)
        self.assertEqual(caught.exception.code, 404)


if __name__ == "__main__":
    unittest.main(verbosity=2)
