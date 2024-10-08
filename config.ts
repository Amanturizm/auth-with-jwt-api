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

  createUsersTableQuery: `
    CREATE TABLE IF NOT EXISTS users (
      id varchar(40) PRIMARY KEY NOT NULL,
      password varchar(60) NOT NULL
    );
  `,
  createFilesTableQuery: `
    CREATE TABLE IF NOT EXISTS files (
      id int AUTO_INCREMENT PRIMARY KEY,
      filename varchar(50) NOT NULL,
      ext varchar(10) NOT NULL,
      mimetype varchar(100) NOT NULL,
      size int NOT NULL,
      date varchar(50) NOT NULL,
      original_name varchar(150) NOT NULL
    );
  `,

  createTokensTableQuery: `
    CREATE TABLE IF NOT EXISTS tokens (
      id int AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(40) NOT NULL,
      token_type ENUM('access', 'refresh') NOT NULL,
      token VARCHAR(255) NOT NULL,
      is_valid BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP
    );
  `,
};

export default config;
