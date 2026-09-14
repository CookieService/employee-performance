"use strict";

const assert = require("node:assert/strict");
require("../js/salary-policy.js");

const { calculatePreSales, calculateAfterSales, resolvePolicyKind } = globalThis.SalaryPolicy;

const preSalesCases = [
  [0, 0, 0],
  [6999.99, 0, 0],
  [7000, 600, 0],
  [10000, 800, 0],
  [15000, 900, 0],
  [20000, 1000, 0],
  [30000, 1000, 200],
  [40000, 1000, 400],
  [60000, 1000, 1000],
  [100000, 1000, 2200],
];

for (const [net, performance, commission] of preSalesCases) {
  const result = calculatePreSales(net);
  assert.equal(result.performanceAmount, performance, `绩效档位错误：${net}`);
  assert.equal(result.commissionAmount, commission, `分段提成错误：${net}`);
}

const afterSales = calculateAfterSales({
  followUp: 250,
  quality: 180,
  improvement: 80,
  refundControl: 500,
});
assert.equal(afterSales.performanceAmount, 760);
assert.deepEqual(afterSales.breakdown, {
  followUp: 200,
  quality: 180,
  improvement: 80,
  refundControl: 300,
});

assert.equal(resolvePolicyKind({ template_name: "白班售前客服" }), "day_pre_sales");
assert.equal(resolvePolicyKind({ template_key: "day_after_sales_customer_service" }), "day_after_sales");
assert.equal(resolvePolicyKind({ template_key: "night_customer_service" }), "legacy");

console.log("salary policy tests passed");
