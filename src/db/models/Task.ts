import { Model, DataTypes, Sequelize } from 'sequelize';

export class Task extends Model {
  public id!: string;
  public type!: string;
  public status!: string;
  public details!: any;
  public error?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

export function initTaskModel(sequelize: Sequelize): void {
  Task.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'running', 'done', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    details: {
      type: DataTypes.JSONB,
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
    underscored: true
  });
} 