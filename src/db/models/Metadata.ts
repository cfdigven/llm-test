import { Model, DataTypes, Sequelize } from 'sequelize';

export class Metadata extends Model {
  public id!: string;
  public url_id!: string;
  public title?: string;
  public description?: string;
  public author?: string;
  public date?: string;
  public additional_data?: any;
  public readonly parsed_at!: Date;
}

export function initMetadataModel(sequelize: Sequelize): void {
  Metadata.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    url_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'urls',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    author: {
      type: DataTypes.STRING,
      allowNull: true
    },
    date: {
      type: DataTypes.STRING,
      allowNull: true
    },
    additional_data: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    parsed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    tableName: 'metadata',
    timestamps: false,
    underscored: true,
    indexes: [
      { fields: ['url_id'] }
    ]
  });
} 