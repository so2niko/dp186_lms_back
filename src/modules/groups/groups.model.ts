import { DataTypes, Model, Sequelize } from 'sequelize';
import { sequelize } from '../../database';
import { Teachers } from '../teachers/teachers.model';

export class Groups extends Model {
  public static readonly tableName: string = 'groups';

  public id: number;
  public groupName: string;
  public groupToken: string;
  public teacherId: number;
  public createdAt: Date;
  public updatedAt: Date;
  public avatarId: number;

  public static prepareInit(seq: Sequelize) {
    this.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          allowNull: false,
          autoIncrement: true,
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
        avatarId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
      },
      {
        sequelize,
        tableName: this.tableName,
      },
    );
  }
}

Groups.prepareInit(sequelize);

Groups.belongsTo(Teachers, {
  foreignKey: 'teacherId',
  as: 'teacher',
});

Teachers.hasMany(Groups, {
  foreignKey: 'teacherId',
  as: 'groups',
});
