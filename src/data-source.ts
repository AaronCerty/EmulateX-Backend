import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config();

export const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  migrations: [__dirname + '/migrations/*.{ts,js}'], // add *.js file because of after build, ts file will be built to js file
  entities: [__dirname + '/entities/*.{ts,js}'], // stupid thomas le hehe
  logging: process.env.DATABASE_LOG_ENABLE === 'true',
  extra: {
    connectionLimit: process.env.DATABASE_LIMIT_CONNECTION,
  },
});

dataSource.initialize();
