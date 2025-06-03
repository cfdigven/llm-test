import { Sequelize } from 'sequelize';
import { Task, initTaskModel } from './Task';
import { URL, initURLModel } from './URL';
import { Metadata, initMetadataModel } from './Metadata';
import { Worker, initWorkerModel } from './Worker';

export async function initModels(sequelize: Sequelize): Promise<void> {
  // Initialize all models
  initTaskModel(sequelize);
  initURLModel(sequelize);
  initMetadataModel(sequelize);
  initWorkerModel(sequelize);

  // Define associations
  URL.hasOne(Metadata, {
    foreignKey: 'url_id',
    as: 'metadata'
  });
  Metadata.belongsTo(URL, {
    foreignKey: 'url_id',
    as: 'url'
  });
}

export {
  Task,
  URL,
  Metadata,
  Worker
}; 