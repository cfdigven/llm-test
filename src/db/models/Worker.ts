import { Model, DataTypes, Sequelize } from 'sequelize';

export class Worker extends Model {
  public id!: string;
  public status!: string;
  public last_heartbeat!: Date;
  public current_batch_id?: string;
  public urls_processed!: number;
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
    status: {
      type: DataTypes.ENUM('active', 'idle', 'failed'),
      allowNull: false,
      defaultValue: 'idle'
    },
    last_heartbeat: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    current_batch_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    urls_processed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'workers',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['status'] },
      { fields: ['last_heartbeat'] }
    ]
  });
} 