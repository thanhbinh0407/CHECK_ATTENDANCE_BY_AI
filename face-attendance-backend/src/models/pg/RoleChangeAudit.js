import { DataTypes } from "sequelize";
import sequelize from "../../db/sequelize.js";

const RoleChangeAudit = sequelize.define(
  "RoleChangeAudit",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    changedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    oldRole: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    newRole: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    tableName: "role_change_audits",
    timestamps: true,
    indexes: [
      { fields: ["userId", "createdAt"] },
      { fields: ["changedBy", "createdAt"] },
    ],
  }
);

export default RoleChangeAudit;
