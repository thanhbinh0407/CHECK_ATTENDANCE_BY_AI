import { DataTypes } from "sequelize";
import sequelize from "../../db/sequelize.js";
import User from "./User.js";
import Dependent from "./Dependent.js";

const DependentDocument = sequelize.define(
  "DependentDocument",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    dependentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Dependent,
        key: "id",
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      }
    },
    documentPath: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: true
    }
  },
  {
    timestamps: true,
    tableName: "dependent_documents",
    indexes: [
      { fields: ["dependentId"] },
      { fields: ["userId"] }
    ]
  }
);

DependentDocument.belongsTo(User, { foreignKey: "userId" });
DependentDocument.belongsTo(Dependent, { foreignKey: "dependentId" });

export default DependentDocument;

