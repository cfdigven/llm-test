import { Sequelize } from 'sequelize';
import config from './config/default';

async function resetDatabase() {
  // Connect to postgres database to be able to drop our database
  const sequelize = new Sequelize({
    host: config.database.host,
    port: config.database.port,
    database: 'postgres', // Connect to default postgres database
    username: config.database.username,
    password: config.database.password,
    dialect: 'postgres',
    logging: console.log
  });

  try {
    console.log('Connecting to postgres database...');
    await sequelize.authenticate();

    // Terminate existing connections to the database
    console.log(`Terminating existing connections to ${config.database.database}...`);
    await sequelize.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${config.database.database}'
      AND pid <> pg_backend_pid();
    `);

    // Drop the database
    console.log(`Dropping database ${config.database.database}...`);
    await sequelize.getQueryInterface().dropDatabase(config.database.database);
    console.log('Database dropped successfully');

  } catch (error) {
    console.error('Error dropping database:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  resetDatabase();
} 