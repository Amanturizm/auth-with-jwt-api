import path from 'path';
import { config as configDotenv } from 'dotenv';

const rootPath = __dirname;

configDotenv();

const config = {
  rootPath,
  publicPath: path.join(rootPath, 'public'),
  db: process.env.DB_URI as string,
  accessSecretKey: process.env.ACCESS_SECRET_KEY as string,
  refreshSecretKey: process.env.REFRESH_SECRET_KEY as string,
};

export default config;
