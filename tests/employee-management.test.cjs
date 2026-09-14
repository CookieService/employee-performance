"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const edgeFunction = fs.readFileSync(
  path.join(root, "supabase", "functions", "manage-employee", "index.ts"),
  "utf8",
);
const migration = fs.readFileSync(
  path.join(root, "supabase", "migrations", "20260915_add_employee_account_archiving.sql"),
  "utf8",
);

assert.match(html, /data-delete-account=/, "员工列表缺少删除账号按钮");
assert.match(html, /action:\s*"delete_account"/, "前端未调用删除账号动作");
assert.match(html, /filter\(e => !e\.deleted_at\)/, "已删除员工没有从列表隐藏");
assert.match(html, /历史填报、绩效和工资记录将保留/, "删除确认未说明历史数据保留策略");

assert.match(edgeFunction, /operator\.role !== "admin"/, "服务端缺少管理员校验");
assert.match(edgeFunction, /target\.id === operator\.id/, "服务端缺少禁止管理自己的校验");
assert.match(edgeFunction, /assertAnotherActiveAdmin/, "服务端缺少最后一个管理员保护");
assert.match(edgeFunction, /auth\.admin\.deleteUser\([\s\S]*true/, "服务端没有安全删除 Auth 登录账号");
assert.match(edgeFunction, /deleted_at:\s*deletedAt/, "服务端没有归档员工记录");
assert.match(edgeFunction, /Access-Control-Allow-Origin/, "Edge Function 缺少 CORS 响应头");

assert.match(migration, /add column if not exists deleted_at timestamptz/i);

console.log("employee management tests passed");
