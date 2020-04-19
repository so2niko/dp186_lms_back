import { QueryInterface, DataTypes } from "sequelize";
import Groups from "../modules/groups/groups.model";

export async function up(query: QueryInterface) {
    return query.createTable(Groups.TableName, {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      groupName: {
        type: DataTypes.STRING(),
        allowNull: false,
      },
      groupToken: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      teacherId: {
        type: DataTypes.INTEGER(),
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: "Date of creation",
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: "Date of the last update",
      },
    });
}

export async function down(query: QueryInterface) {
    return query.dropTable(Groups.TableName);
}
