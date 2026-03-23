/**
 * migrate-roles.js
 * ────────────────────────────────────────────────────────────────────────────
 * Chạy một lần để chuyển đổi hệ thống vai trò cũ → mới:
 *
 *  Cũ (3 roles)          →  Mới (5 roles)
 *  ─────────────────────────────────────────
 *  admin                 →  manager
 *  accountant            →  accountant  (giữ nguyên)
 *  employee              →  employee    (giữ nguyên)
 *                           hr          (mới - Nhân sự)
 *                           supervisor  (mới - Quản lý)
 *
 * Cách chạy:
 *   node migrate-roles.js
 *
 * Yêu cầu: file .env phải có PG_DATABASE, PG_USER, PG_PASSWORD, PG_HOST, PG_PORT
 * ────────────────────────────────────────────────────────────────────────────
 */

import 'dotenv/config';
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(
  process.env.PG_DATABASE || 'facedb',
  process.env.PG_USER     || 'facedb',
  process.env.PG_PASSWORD || '12345',
  {
    host:    process.env.PG_HOST || '127.0.0.1',
    port:    process.env.PG_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

async function migrateRoles() {
  const t = await sequelize.transaction();
  try {
    await sequelize.authenticate();
    console.log('✅  Kết nối PostgreSQL thành công');

    // ── 1. Thêm các giá trị ENUM mới vào cột role ────────────────────────────
    // PostgreSQL không cho phép xóa giá trị ENUM trực tiếp, ta thêm mới trước
    // rồi xóa cũ sau khi đã migrate dữ liệu.
    console.log('🔧  Thêm giá trị ENUM mới: manager, hr, supervisor ...');

    await sequelize.query(`
      ALTER TYPE "enum_users_role"
        ADD VALUE IF NOT EXISTS 'manager';
    `, { transaction: t });

    await sequelize.query(`
      ALTER TYPE "enum_users_role"
        ADD VALUE IF NOT EXISTS 'hr';
    `, { transaction: t });

    await sequelize.query(`
      ALTER TYPE "enum_users_role"
        ADD VALUE IF NOT EXISTS 'supervisor';
    `, { transaction: t });

    // ADD VALUE không thể chạy trong transaction trên PostgreSQL 11 trở xuống,
    // nhưng từ pg 12+ thì OK. Nếu gặp lỗi, commit trước rồi alter sau.
    await t.commit();

    // ── 2. Chạy transaction riêng để UPDATE dữ liệu ─────────────────────────
    const t2 = await sequelize.transaction();

    // Đổi 'admin' → 'manager'
    const [, adminResult] = await sequelize.query(
      `UPDATE users SET role = 'manager' WHERE role = 'admin'`,
      { transaction: t2 }
    );
    console.log(`✅  Đã đổi ${adminResult?.rowCount ?? '?'} tài khoản admin → manager`);

    await t2.commit();

    // ── 3. Xóa giá trị ENUM cũ 'admin' (tuỳ chọn, yêu cầu pg >= 12) ─────────
    // PostgreSQL không hỗ trợ DROP ENUM VALUE trực tiếp.
    // Cách an toàn: tạo TYPE mới → ALTER COLUMN → DROP TYPE cũ
    try {
      await sequelize.query(`
        -- Tạo kiểu ENUM mới không có 'admin'
        CREATE TYPE "enum_users_role_new" AS ENUM (
          'manager', 'hr', 'accountant', 'supervisor', 'employee'
        );

        -- Chuyển cột sang kiểu mới
        ALTER TABLE users
          ALTER COLUMN role TYPE "enum_users_role_new"
            USING role::text::"enum_users_role_new";

        -- Xóa kiểu cũ (có thể fail nếu còn references - bỏ qua nếu lỗi)
        DROP TYPE "enum_users_role";

        -- Đổi tên kiểu mới thành tên cũ
        ALTER TYPE "enum_users_role_new" RENAME TO "enum_users_role";
      `);
      console.log('✅  Đã xóa giá trị ENUM cũ "admin", giữ lại 5 role mới');
    } catch (enumErr) {
      console.warn('⚠️  Không thể xóa ENUM cũ (không nghiêm trọng):', enumErr.message);
      console.warn('   Giá trị "admin" vẫn còn trong ENUM nhưng không còn user nào dùng.');
    }

    // ── 4. Tóm tắt kết quả ───────────────────────────────────────────────────
    const [roles] = await sequelize.query(
      `SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY count DESC`
    );
    console.log('\n📊  Thống kê vai trò sau migration:');
    console.table(roles);

    console.log('\n🎉  Migration hoàn thành!');
    console.log('   Vai trò mới cần tạo thủ công: hr (Nhân sự), supervisor (Quản lý)');
    console.log('   Dùng Manager account để tạo tài khoản HR và Supervisor qua giao diện.\n');

  } catch (err) {
    try { await t.rollback(); } catch (_) { /* đã commit */ }
    console.error('❌  Migration thất bại:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrateRoles();
