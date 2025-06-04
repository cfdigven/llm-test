import { Model, DataTypes, Sequelize } from 'sequelize';

export class URL extends Model {
  public id!: string;
  public url!: string;
  public domain!: string;
  public status!: 'new' | 'processing' | 'done' | 'failed';
  public priority!: number;
  public retries!: number;
  public worker_id?: string;
  public batch_id?: string;
  public worker_type?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

export function initURLModel(sequelize: Sequelize): void {
  URL.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true
    },
    domain: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('new', 'processing', 'done', 'failed'),
      allowNull: false,
      defaultValue: 'new'
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    retries: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    worker_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    batch_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    worker_type: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'urls',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['status'] },
      { fields: ['domain'] },
      { fields: ['batch_id'] },
      { fields: ['worker_id'] },
      { fields: ['worker_type'] }
    ]
  });
} 