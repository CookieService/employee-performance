(function (root) {
  "use strict";

  const POLICY_VERSION = "2026-09";

  function amount(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? Math.max(0, number) : 0;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, amount(value)));
  }

  function resolvePolicyKind(template) {
    if (!template) return "legacy";

    const configured = String(template.policy_type || "").trim().toLowerCase();
    if (["day_pre_sales", "day_after_sales", "legacy"].includes(configured)) {
      return configured;
    }

    const identity = `${template.template_key || ""} ${template.template_name || ""}`.toLowerCase();
    if (/售后|after[\s_-]?sales/.test(identity)) return "day_after_sales";
    if (/售前|pre[\s_-]?sales|presales/.test(identity)) return "day_pre_sales";
    return "legacy";
  }

  function calculatePreSales(netPerformance) {
    const net = amount(netPerformance);
    let performance = 0;

    if (net >= 20000) performance = 1000;
    else if (net >= 15000) performance = 900;
    else if (net >= 10000) performance = 800;
    else if (net >= 7000) performance = 600;

    const tierOne = Math.min(Math.max(net - 20000, 0), 20000) * 0.02;
    const tierTwo = Math.max(net - 40000, 0) * 0.03;

    return {
      baseSalary: 3000,
      performanceAmount: performance,
      commissionAmount: tierOne + tierTwo,
      netPerformance: net,
    };
  }

  function calculateAfterSales(parts) {
    const breakdown = {
      followUp: clamp(parts?.followUp, 0, 200),
      quality: clamp(parts?.quality, 0, 200),
      improvement: clamp(parts?.improvement, 0, 100),
      refundControl: clamp(parts?.refundControl, 0, 300),
    };

    return {
      baseSalary: 4000,
      performanceAmount: Object.values(breakdown).reduce((sum, value) => sum + value, 0),
      commissionAmount: 0,
      breakdown,
    };
  }

  root.SalaryPolicy = Object.freeze({
    POLICY_VERSION,
    resolvePolicyKind,
    calculatePreSales,
    calculateAfterSales,
  });
})(globalThis);
