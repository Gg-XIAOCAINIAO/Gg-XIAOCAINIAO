// 冒烟测试：把 functions/ 下所有模块都 import 一遍，确保相对路径与语法在部署前就是对的。
// 运行：node tools/test_imports.mjs
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.join(process.cwd(), "functions");
const files = [];

function walk(directory) {
  for (const name of readdirSync(directory)) {
    const full = path.join(directory, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (name.endsWith(".js")) files.push(full);
  }
}

walk(root);

let failures = 0;
for (const file of files) {
  const relative = file.slice(root.length + 1).replace(/\\/g, "/");
  try {
    await import(pathToFileURL(file).href);
    console.log(`ok   ${relative}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${relative} -> ${error && error.message}`);
  }
}

console.log(`\n${files.length - failures}/${files.length} function modules imported`);
if (failures) process.exit(1);
console.log("ALL FUNCTIONS IMPORT OK");
