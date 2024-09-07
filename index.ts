import express from 'express';
import cors from 'cors';
import mysql from 'mysql2';
import config from './config';

const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('*', (_, res) => res.sendStatus(404));

const connection = mysql.createConnection(config.db);

connection.connect((err) => {
  if (err) {
    console.log('Error connecting to database:', err.stack);
    return;
  }

  app.listen(port, () => console.log(`Server running at ${port} port...`));
});
