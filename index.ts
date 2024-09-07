import express from 'express';
import cors from 'cors';
import mysql from 'mysql2';
import config from './config';
import usersRouter from './routers/users';

const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/users', usersRouter);

app.get('*', (_, res) => res.sendStatus(404));

export const db = mysql.createConnection(config.db);

db.connect((err) => {
  if (err) {
    console.log('Error connecting to database:', err.stack);
    return;
  }

  db.query(
    `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(40) PRIMARY KEY NOT NULL,
      password VARCHAR(60) NOT NULL
    );
  `,
  );

  app.listen(port, () => console.log(`Server running at ${port} port...`));
});
