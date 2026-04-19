import { DataTypes } from "sequelize";
import sequelize from "../../db/sequelize.js";

/**
 * Generic action audit log for the Approval Responsibility Log.
 *
 * - Manager / HR / Accountant / Supervisor admin actions are recorded here
 *   and rendered as individual rows in the UI.
 * - Employee self-service actions are also recorded here but grouped into
 *   one "daily summary" row per employee per day in the UI.
 */
const ActionAudit = sequelize.define(
  "ActionAudit",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    actorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    actorRole: {
      type: DataTypes.ENUM(
        "manager",
        "hr",
        "accountant",
        "supervisor",
        "employee",
        "system"
      ),
      allowNull: false,
      defaultValue: "system",
    },
    category: {
      type: DataTypes.ENUM(
        "employee_lifecycle",
        "employee_update",
        "password",
        "role_change",
        "own_request",
        "own_profile",
        "own_document",
        "own_qualification",
        "own_dependent",
        "own_work_experience",
        "own_notification",
        "other"
      ),
      allowNull: false,
      defaultValue: "other",
    },
    action: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    targetUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    entityType: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    summary: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "action_audits",
    timestamps: true,
    indexes: [
      { fields: ["actorRole", "createdAt"] },
      { fields: ["actorId", "createdAt"] },
      { fields: ["targetUserId", "createdAt"] },
      { fields: ["action"] },
      { fields: ["category"] },
    ],
  }
);

export default ActionAudit;
