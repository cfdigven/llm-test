import { Model, DataTypes, Sequelize } from 'sequelize';

export class Worker extends Model {
  public id!: string;
  public type!: string;           // Worker type (e.g., 'blog-worker')
  public status!: 'idle' | 'active' | 'failed' | 'completed';
  public instance_number!: number; // Which instance of the worker type (1-based)
  public urls_processed!: number;
  public current_batch_id?: string;
  public last_heartbeat?: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

export function initWorkerModel(sequelize: Sequelize): void {
  Worker.init({
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
      type: DataTypes.ENUM('idle', 'active', 'failed', 'completed'),
      allowNull: false,
      defaultValue: 'idle'
    },
    instance_number: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    urls_processed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    current_batch_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    last_heartbeat: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'workers',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['type'] },
      { fields: ['status'] },
      { fields: ['instance_number'] },
      { fields: ['last_heartbeat'] }
    ]
  });
} 