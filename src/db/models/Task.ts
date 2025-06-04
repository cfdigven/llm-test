import { Model, DataTypes, Sequelize } from 'sequelize';

export class Task extends Model {
  public id!: string;
  public type!: string;
  public status!: 'todo' | 'processing' | 'done' | 'error';
  public details!: any;
  public error?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

export function initTaskModel(sequelize: Sequelize): void {
  Task.init({
    id: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('todo', 'processing', 'done', 'error'),
      allowNull: false,
      defaultValue: 'todo'
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'tasks',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['type'] },
      { fields: ['status'] }
    ]
  });
} 