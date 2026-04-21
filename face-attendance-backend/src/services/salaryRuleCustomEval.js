import { calculateSeniority } from "./senioritySalaryService.js";

/**
 * SalaryRule triggerType "custom" — same semantics as salaryCalculationService / breakdown UI.
 * @param {object} rule - SalaryRule row
 * @param {object} user - User with optional Department, JobTitle (belongsTo)
 * @param {number} baseSalary
 * @returns {{ shouldApply: boolean, ruleAmount: number, reason?: string, quantity?: number }}
 */
export function evaluateCustomSalaryRule(rule, user, baseSalary) {
  const name = (rule.name || "").toLowerCase();

  if (name.includes("seniority")) {
    const seniority = calculateSeniority(user.startDate);
    let tier = 0;
    if (seniority >= 10) tier = 4;
    else if (seniority >= 5) tier = 3;
    else if (seniority >= 3) tier = 2;
    else if (seniority >= 1) tier = 1;
    if (tier <= 0) {
      return { shouldApply: false, ruleAmount: 0, reason: "", quantity: 0 };
    }
    const ruleAmount =
      rule.amountType === "percentage"
        ? baseSalary * (parseFloat(rule.amount) / 100) * tier
        : parseFloat(rule.amount) * tier;
    return {
      shouldApply: true,
      ruleAmount,
      reason: `Seniority ${seniority} year(s) (tier ${tier})`,
      quantity: seniority
    };
  }

  if (name.includes("performance")) {
    const ruleAmount =
      rule.amountType === "percentage"
        ? baseSalary * (parseFloat(rule.amount) / 100)
        : parseFloat(rule.amount);
    return {
      shouldApply: true,
      ruleAmount,
      reason: "Performance bonus (monthly)",
      quantity: 1
    };
  }

  if (name.includes("technical")) {
    const deptCode = user.Department?.code;
    const deptName = user.Department?.name || "";
    const isEngineering = deptCode === "KT" || /engineering/i.test(deptName);
    if (!isEngineering) {
      return { shouldApply: false, ruleAmount: 0, reason: "", quantity: 0 };
    }
    const ruleAmount =
      rule.amountType === "percentage"
        ? baseSalary * (parseFloat(rule.amount) / 100)
        : parseFloat(rule.amount);
    return {
      shouldApply: true,
      ruleAmount,
      reason: "Technical allowance (Engineering)",
      quantity: 1
    };
  }

  if (name.includes("management")) {
    const code = user.JobTitle?.code;
    if (!["TP", "PTP"].includes(code)) {
      return { shouldApply: false, ruleAmount: 0, reason: "", quantity: 0 };
    }
    const ruleAmount =
      rule.amountType === "percentage"
        ? baseSalary * (parseFloat(rule.amount) / 100)
        : parseFloat(rule.amount);
    return {
      shouldApply: true,
      ruleAmount,
      reason: "Management allowance (TP/PTP)",
      quantity: 1
    };
  }

  return { shouldApply: false, ruleAmount: 0, reason: "", quantity: 0 };
}
