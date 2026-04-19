/**
 * Standalone seeder for the Approval Responsibility Log.
 *
 * Populates the `action_audits` table with mock rows that cover every
 * filter option in the UI (role, action category, date range) so QA can
 * verify the log without triggering real user actions.
 *
 * Usage:
 *   node seed-action-audits.js           # top up without clearing
 *   node seed-action-audits.js --reset   # delete seeded rows first
 *
 * Seeded rows are tagged `metadata.seed = true` so --reset can target
 * them safely without touching audit entries written by real users.
 */
import dotenv from 'dotenv';
dotenv.config();

import sequelize from './src/db/sequelize.js';
import {
  User,
  ActionAudit,
  ApprovalWorkflow,
  LeaveRequest,
  OvertimeRequest,
  BusinessTripRequest,
  SalaryAdvance,
} from './src/models/pg/index.js';

async function main() {
  const reset = process.argv.includes('--reset');

  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    if (reset) {
      const removedAudits = await ActionAudit.destroy({
        where: sequelize.literal(`(metadata ->> 'seed') = 'true'`),
      });
      console.log(`Removed ${removedAudits} previously-seeded ActionAudit rows.`);

      const removedWorkflows = await ApprovalWorkflow.destroy({
        where: sequelize.literal(`comments LIKE 'SEED:%'`),
      });
      console.log(`Removed ${removedWorkflows} previously-seeded ApprovalWorkflow rows.`);
    }

    const [manager, hrStaff, accountant, supervisor] = await Promise.all([
      User.findOne({ where: { role: 'manager' }, order: [['id', 'ASC']] }),
      User.findOne({ where: { role: 'hr' }, order: [['id', 'ASC']] }),
      User.findOne({ where: { role: 'accountant' }, order: [['id', 'ASC']] }),
      User.findOne({ where: { role: 'supervisor' }, order: [['id', 'ASC']] }),
    ]);

    if (!manager || !hrStaff || !accountant || !supervisor) {
      throw new Error(
        'Missing one of manager/hr/accountant/supervisor accounts. Run seed-data.js first.'
      );
    }

    const employees = await User.findAll({
      where: { role: 'employee' },
      order: [['id', 'ASC']],
      limit: 60,
    });
    if (employees.length < 7) {
      throw new Error('Need at least 7 employees; run seed-data.js first.');
    }

    const baseTime = new Date();
    const at = (daysAgo, h, m = 0) => {
      const d = new Date(baseTime);
      d.setDate(d.getDate() - daysAgo);
      d.setHours(h, m, 0, 0);
      return d;
    };
    const pick = (i) => employees[i % employees.length];

    const tag = (extra = {}) => ({ seed: true, ...extra });

    const rows = [];

    // ─── Manager ────────────────────────────────────────────────────
    const managerActions = [
      [12, 9,  'employee.create',           'employee_lifecycle', pick(10), 'Created employee record'],
      [10, 10, 'employee.update',           'employee_update',    pick(11), 'Updated employee department'],
      [9,  11, 'employee.deactivate',       'employee_lifecycle', pick(12), 'Deactivated employee account'],
      [8,  14, 'employee.restore',          'employee_lifecycle', pick(12), 'Restored employee account'],
      [6,  15, 'employee.reset_password',   'password',           pick(13), 'Reset employee password'],
      [5,  16, 'employee.update_role',      'role_change',        pick(14), 'Promoted employee to supervisor'],
      [3,  10, 'employee.update_role',      'role_change',        pick(14), 'Rolled back employee role'],
      [2,  11, 'employee.delete_permanent', 'employee_lifecycle', pick(15), 'Permanently deleted employee'],
      [1,  14, 'employee.update',           'employee_update',    pick(16), 'Updated employee salary grade'],
    ];
    for (const [d, h, action, category, target, summary] of managerActions) {
      rows.push({
        actorId: manager.id, actorRole: 'manager',
        category, action,
        targetUserId: target?.id || null,
        entityType: 'user', entityId: target?.id || null,
        summary, metadata: tag(),
        ipAddress: '127.0.0.1', userAgent: 'seed-script',
        createdAt: at(d, h), updatedAt: at(d, h),
      });
    }

    // ─── HR ─────────────────────────────────────────────────────────
    const hrActions = [
      [13, 9,  'employee.bulk_create',    'employee_lifecycle', null,      'Bulk imported 12 employees from CSV', { count: 12 }],
      [11, 10, 'employee.create',         'employee_lifecycle', pick(20),  'Created employee record'],
      [11, 11, 'employee.create',         'employee_lifecycle', pick(21),  'Created employee record'],
      [10, 13, 'employee.update',         'employee_update',    pick(22),  'Updated contact phone'],
      [9,  14, 'employee.update',         'employee_update',    pick(23),  'Updated bank account'],
      [7,  9,  'employee.reset_password', 'password',           pick(24),  'Reset employee password (user request)'],
      [6,  11, 'employee.deactivate',     'employee_lifecycle', pick(25),  'Deactivated employee on offboarding'],
      [4,  15, 'employee.update',         'employee_update',    pick(26),  'Updated job title'],
      [2,  16, 'employee.reset_password', 'password',           pick(27),  'Reset employee password'],
      [1,  10, 'employee.update',         'employee_update',    pick(28),  'Updated insurance base salary'],
    ];
    for (const [d, h, action, category, target, summary, extra] of hrActions) {
      rows.push({
        actorId: hrStaff.id, actorRole: 'hr',
        category, action,
        targetUserId: target?.id || null,
        entityType: 'user', entityId: target?.id || null,
        summary, metadata: tag(extra),
        ipAddress: '127.0.0.1', userAgent: 'seed-script',
        createdAt: at(d, h), updatedAt: at(d, h),
      });
    }

    // ─── Accountant ────────────────────────────────────────────────
    const accountantActions = [
      [8, 9,  'payroll.finalize',    'other', 'Finalized monthly payroll',               { month: 2, year: 2026 }],
      [8, 10, 'payroll.mark_paid',   'other', 'Marked payroll as paid',                  { batch: 'BANK-2026-02' }],
      [3, 14, 'salary_advance.note', 'other', 'Added accounting note to advance request', null],
    ];
    for (const [d, h, action, category, summary, extra] of accountantActions) {
      rows.push({
        actorId: accountant.id, actorRole: 'accountant',
        category, action, targetUserId: null,
        entityType: 'payroll', entityId: null,
        summary, metadata: tag(extra),
        ipAddress: '127.0.0.1', userAgent: 'seed-script',
        createdAt: at(d, h), updatedAt: at(d, h),
      });
    }

    // ─── Supervisor ────────────────────────────────────────────────
    const supervisorActions = [
      [9, 9,  'schedule.update', 'other', 'Rearranged weekly team schedule'],
      [4, 15, 'shift.approve',   'other', 'Approved shift swap for team member'],
    ];
    for (const [d, h, action, category, summary] of supervisorActions) {
      rows.push({
        actorId: supervisor.id, actorRole: 'supervisor',
        category, action, targetUserId: null,
        entityType: 'schedule', entityId: null,
        summary, metadata: tag(),
        ipAddress: '127.0.0.1', userAgent: 'seed-script',
        createdAt: at(d, h), updatedAt: at(d, h),
      });
    }

    // ─── Employee (every "own_*" category across multiple employees) ─
    const employeePlaybook = [
      [0,  12, 8,  10, 'leave.create',              'own_request',        'leave_request',         'Submitted paid leave request'],
      [0,  12, 9,  20, 'overtime.create',           'own_request',        'overtime_request',      'Submitted overtime request'],
      [0,  12, 10, 5,  'profile.change_password',   'own_profile',        'user',                  'Changed own password'],
      [0,  12, 14, 30, 'document.create',           'own_document',       'document',              'Uploaded ID card scan'],

      [1,  11, 8,  0,  'dependent.create',          'own_dependent',      'dependent',             'Added dependent Tran Bao'],
      [1,  11, 8,  5,  'dependent.upload_documents','own_dependent',      'dependent',             'Uploaded documents for dependent'],
      [1,  11, 14, 0,  'qualification.create',      'own_qualification',  'qualification',         'Added bachelor degree'],
      [1,  11, 14, 15, 'work_experience.create',    'own_work_experience','work_experience',       'Added previous work experience'],
      [1,  11, 15, 0,  'notification.read',         'own_notification',   'notification',          'Marked notification as read'],

      [2,  10, 9,  30, 'business_trip.create',      'own_request',        'business_trip_request', 'Submitted business trip request'],
      [2,  10, 13, 0,  'salary_advance.create',     'own_request',        'salary_advance',        'Submitted salary advance request'],
      [2,  10, 16, 10, 'profile.update',            'own_profile',        'user',                  'Updated phone number'],

      [3,  7,  9,  0,  'qualification.update',      'own_qualification',  'qualification',         'Updated qualification issue year'],
      [3,  7,  9,  30, 'qualification.delete',      'own_qualification',  'qualification',         'Removed outdated certificate'],
      [3,  7,  10, 0,  'document.delete',           'own_document',       'document',              'Deleted duplicate document'],
      [3,  7,  11, 0,  'notification.delete',       'own_notification',   'notification',          'Deleted old notification'],

      [4,  5,  8,  45, 'work_experience.update',    'own_work_experience','work_experience',       'Adjusted end date of work experience'],
      [4,  5,  9,  0,  'work_experience.delete',    'own_work_experience','work_experience',       'Removed irrelevant work experience'],
      [4,  5,  10, 30, 'dependent.update',          'own_dependent',      'dependent',             'Updated dependent relationship'],
      [4,  5,  11, 0,  'dependent.delete',          'own_dependent',      'dependent',             'Removed dependent'],

      [5,  3,  9,  0,  'leave.update',              'own_request',        'leave_request',         'Updated leave request'],
      [5,  3,  10, 0,  'leave.cancel',              'own_request',        'leave_request',         'Cancelled leave request'],
      [5,  3,  14, 0,  'profile.update',            'own_profile',        'user',                  'Updated address'],

      [6,  1,  8,  0,  'leave.create',              'own_request',        'leave_request',         'Submitted sick leave request'],
      [6,  1,  8,  30, 'notification.read',         'own_notification',   'notification',          'Read HR announcement'],
      [6,  1,  17, 0,  'document.create',           'own_document',       'document',              'Uploaded training certificate'],
    ];
    for (const [empIdx, dAgo, h, mn, action, category, entityType, summary] of employeePlaybook) {
      const emp = pick(empIdx);
      rows.push({
        actorId: emp.id, actorRole: 'employee',
        category, action,
        targetUserId: category === 'own_profile' ? emp.id : null,
        entityType, entityId: emp.id,
        summary, metadata: tag(),
        ipAddress: '127.0.0.1', userAgent: 'seed-script',
        createdAt: at(dAgo, h, mn), updatedAt: at(dAgo, h, mn),
      });
    }

    // ─── System (actorId = null) ───────────────────────────────────
    const systemActions = [
      [13, 0,  'system.daily_rollover',     'Daily rollover: archived attendance logs', null],
      [7,  0,  'system.payroll_cron',       'Monthly payroll cron triggered for Feb 2026', { month: 2, year: 2026 }],
      [0,  1,  'system.notification_sweep', 'Purged notifications older than 90 days',  null],
    ];
    for (const [d, h, action, summary, extra] of systemActions) {
      rows.push({
        actorId: null, actorRole: 'system',
        category: 'other', action,
        targetUserId: null, entityType: 'system', entityId: null,
        summary, metadata: tag(extra),
        ipAddress: '127.0.0.1', userAgent: 'cron/1.0',
        createdAt: at(d, h), updatedAt: at(d, h),
      });
    }

    await ActionAudit.bulkCreate(rows);
    console.log(`Inserted ${rows.length} ActionAudit rows.`);

    const byRole = rows.reduce((acc, r) => {
      acc[r.actorRole] = (acc[r.actorRole] || 0) + 1;
      return acc;
    }, {});
    const byCategory = rows.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {});
    console.log('Rows by role:', byRole);
    console.log('Rows by category:', byCategory);

    // ────────────────────────────────────────────────────────────────
    // Fill approval-side filter gaps for the Approval Responsibility Log
    //   · Status = Skipped → ApprovalWorkflow(status='skipped', approvedAt=set)
    //   · Status = Pending → ApprovalWorkflow(status='pending', approvedAt=set)
    // Seeded rows are tagged via `comments` prefix 'SEED:' so the --reset flag
    // can remove them safely. The "Other / Payroll" request-type filter was
    // dropped from the UI (payrollRoutes.js is not mounted), so no Payroll
    // approval rows are generated here.
    // ────────────────────────────────────────────────────────────────

    // Pull a handful of existing approved requests to hang workflow traces off.
    const [sampleLeaves, sampleOvertimes, sampleTrips, sampleAdvances] = await Promise.all([
      LeaveRequest.findAll({ where: { status: 'approved' }, order: [['id', 'ASC']], limit: 6 }),
      OvertimeRequest.findAll({ where: { approvalStatus: 'approved' }, order: [['id', 'ASC']], limit: 6 }),
      BusinessTripRequest.findAll({ where: { approvalStatus: 'approved' }, order: [['id', 'ASC']], limit: 4 }),
      SalaryAdvance.findAll({ where: { approvalStatus: 'approved' }, order: [['id', 'ASC']], limit: 6 }),
    ]);

    const workflowRows = [];
    const pushWorkflow = ({ requestType, requestId, level, approverId, status, daysAgo, hour, comment }) => {
      workflowRows.push({
        requestType,
        requestId,
        level,
        approverId,
        status,
        approvedAt: at(daysAgo, hour),
        comments: `SEED:${comment}`,
        isRequired: true,
      });
    };

    // Skipped: typically happens when a level was auto-skipped (e.g. HR not
    // required for short leave). We tag a few mid-levels as skipped.
    sampleLeaves.slice(0, 3).forEach((r, i) =>
      pushWorkflow({
        requestType: 'leave',
        requestId: r.id,
        level: 2,
        approverId: hrStaff.id,
        status: 'skipped',
        daysAgo: 6 - i,
        hour: 10 + i,
        comment: 'HR review auto-skipped (policy exempt)',
      })
    );
    sampleOvertimes.slice(0, 2).forEach((r, i) =>
      pushWorkflow({
        requestType: 'overtime',
        requestId: r.id,
        level: 3,
        approverId: manager.id,
        status: 'skipped',
        daysAgo: 5 - i,
        hour: 11 + i,
        comment: 'Manager approval not required for OT < 4h',
      })
    );
    sampleTrips.slice(0, 1).forEach((r) =>
      pushWorkflow({
        requestType: 'business_trip',
        requestId: r.id,
        level: 2,
        approverId: hrStaff.id,
        status: 'skipped',
        daysAgo: 4,
        hour: 14,
        comment: 'Domestic trip — HR check not required',
      })
    );

    // Pending: assigned to the approver with an approvedAt timestamp acting as
    // "routed-at" time. Semantic stretch, but realistic enough for filter demos.
    sampleAdvances.slice(0, 3).forEach((r, i) =>
      pushWorkflow({
        requestType: 'salary_advance',
        requestId: r.id,
        level: 2,
        approverId: accountant.id,
        status: 'pending',
        daysAgo: 3 - i,
        hour: 9 + i,
        comment: 'Awaiting accountant review',
      })
    );
    sampleLeaves.slice(3, 6).forEach((r, i) =>
      pushWorkflow({
        requestType: 'leave',
        requestId: r.id,
        level: 3,
        approverId: manager.id,
        status: 'pending',
        daysAgo: 2 - i,
        hour: 15,
        comment: 'Awaiting final manager review',
      })
    );

    if (workflowRows.length) {
      await ApprovalWorkflow.bulkCreate(workflowRows);
      console.log(`Inserted ${workflowRows.length} ApprovalWorkflow rows (skipped + pending).`);
    }

    console.log('Filter-coverage summary:');
    console.log('  Role:          manager / hr / accountant / supervisor / employee / system');
    console.log('  Category:      employee_lifecycle, employee_update, password, role_change, own_request, own_profile, own_document, own_qualification, own_dependent, own_work_experience, own_notification, other');
    console.log('  Request type:  leave, overtime, business_trip, salary_advance');
    console.log('  Status:        approved, rejected, skipped, pending');

    process.exit(0);
  } catch (err) {
    console.error('[seed-action-audits] Error:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

main();
