/**
 * Sửa cấu hình cũ nhầm 10,5% cho cột BHXH NLĐ (trùng tổng 8+1,5+1) trong khi BHYT/BHTN đã tách dòng.
 * Đặt lại employeeSocialInsuranceRate = 8 khi khớp mẫu lỗi.
 */
import sequelize from "../sequelize.js";

async function migrate() {
  try {
    await sequelize.query(`
      UPDATE insurance_configs
      SET "employeeSocialInsuranceRate" = 8
      WHERE "employeeSocialInsuranceRate" = 10.5
        AND COALESCE("employeeHealthInsuranceRate", 0) = 1.5
        AND COALESCE("employeeUnemploymentInsuranceRate", 0) = 1.0
    `);
    console.log("✅ fix-insurance-bhxh-nld-rate: BHXH NLĐ 10.5% → 8% (khi BHYT 1.5%, BHTN 1%)");
    process.exit(0);
  } catch (err) {
    console.error("❌ fix-insurance-bhxh-nld-rate failed:", err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrate();
