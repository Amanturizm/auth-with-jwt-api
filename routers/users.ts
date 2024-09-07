import express from 'express';
import bcrypt from 'bcrypt';
import jwt, { JwtPayload, VerifyErrors } from 'jsonwebtoken';
import { db } from '../index';
import config from '../config';
import { RowDataPacket } from 'mysql2';
import { JWTUser, User } from '../types';

const usersRouter = express.Router();

const getAccessToken = (payload: JWTUser) => {
  return jwt.sign(payload, config.accessSecretKey, { expiresIn: '10m' });
};

const getRefreshToken = (payload: JWTUser) => {
  return jwt.sign(payload, config.refreshSecretKey, { expiresIn: '7d' });
};

usersRouter.post('/signin', async (req, res) => {
  try {
    const { id, password } = req.body as User;

    if (!id || !password) {
      return res.status(400).send({ message: 'id | password is required!' });
    }

    const checkUserQuery = 'SELECT * FROM users WHERE id = ?';

    db.query(checkUserQuery, [id], async (err, results: RowDataPacket[]) => {
      if (err) {
        return res.status(500).send({ error: err.message });
      }

      if (!results.length) {
        return res.status(400).send({ message: 'id or password is incorrect!' });
      }

      const user = results[0] as User;

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(400).send({ error: 'id or password is incorrect!' });
      }

      const accessToken = getAccessToken({ id: user.id });
      const refreshToken = getRefreshToken({ id: user.id });

      return res.status(200).send({ accessToken, refreshToken });
    });
  } catch (e) {
    return res.sendStatus(500);
  }
});

usersRouter.post('/signin/new_token', (req, res) => {
  const refreshToken = req.get('Authorization')?.split(' ')[1];

  if (!refreshToken) {
    return res.status(400).send({ message: 'Refresh token is required!' });
  }

  jwt.verify(
    refreshToken,
    config.refreshSecretKey,
    (err: VerifyErrors | null, payload: JwtPayload | string | undefined) => {
      const user = payload as JWTUser;

      if (err || !user.id) {
        return res.status(403).send({ message: 'Invalid refresh token!' });
      }

      const newAccessToken = getAccessToken({ id: user.id });

      return res.status(200).send({ accessToken: newAccessToken });
    },
  );
});

usersRouter.post('/signup', async (req, res) => {
  try {
    const { id, password } = req.body as User;

    if (!id || !password) {
      return res.status(400).send({ message: 'id | password is required!' });
    }

    const checkUserQuery = 'SELECT id FROM users WHERE id = ?';

    db.query(checkUserQuery, [id], async (err, results: RowDataPacket[]) => {
      if (err) {
        return res.status(500).send({ error: err.message });
      }

      if (results.length > 0) {
        return res.status(400).send({ message: 'A user with this id already exists!' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const query = `INSERT INTO users (id, password) VALUES (?, ?)`;

      db.query(query, [id, hashedPassword], (err) => {
        if (err) return res.sendStatus(500);

        const accessToken = getAccessToken({ id });
        const refreshToken = getRefreshToken({ id });

        return res.status(201).send({ accessToken, refreshToken });
      });
    });
  } catch (e) {
    return res.sendStatus(500);
  }
});

export default usersRouter;
