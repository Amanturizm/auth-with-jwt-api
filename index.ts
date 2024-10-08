import express from 'express';
import cors from 'cors';
import mysql from 'mysql2';
import config from './config';
import usersRouter from './routers/users';
import fileRouter from './routers/file';

const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/', usersRouter);
app.use('/file', fileRouter);

app.get('*', (_, res) => res.sendStatus(404));

export const db = mysql.createConnection(config.db);

db.connect((err) => {
  if (err) {
    console.log('Error connecting to database:', err.stack);
    return;
  }

  db.query(config.createUsersTableQuery);
  db.query(config.createFilesTableQuery);
  db.query(config.createTokensTableQuery);

  console.log('Database connected.');
});

app.listen(port, () => console.log(`Server running at ${port} port...`));
