import express from 'express';
import bcrypt from 'bcrypt';
import jwt, { JwtPayload, VerifyErrors } from 'jsonwebtoken';
import { db } from '../index';
import auth, { RequestWithUser } from '../middleware/auth';
import { OkPacketParams, QueryResult, RowDataPacket } from 'mysql2';
import config from '../config';
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
        return res.sendStatus(500);
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

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const deleteOldTokensQuery = 'DELETE FROM tokens WHERE user_id = ? AND token_type = ?';
      db.query(deleteOldTokensQuery, [user.id, 'refresh'], (err) => {
        if (err) return res.sendStatus(500);

        const insertTokenQuery =
          'INSERT INTO tokens (user_id, token_type, token, is_valid, expires_at) VALUES (?, ?, ?, ?, ?)';

        db.query(insertTokenQuery, [user.id, 'refresh', refreshToken, true, expiresAt], (err) => {
          if (err) return res.sendStatus(500);

          return res.status(200).send({ accessToken, refreshToken });
        });
      });
    });
  } catch (e) {
    return res.sendStatus(500);
  }
});

usersRouter.post('/signin/new_token', (req, res) => {
  try {
    const refreshToken = req.get('Authorization')?.split(' ')[1];

    if (!refreshToken) {
      return res.status(400).send({ message: 'Refresh token is required!' });
    }

    jwt.verify(
      refreshToken,
      config.refreshSecretKey,
      (err: VerifyErrors | null, payload: JwtPayload | string | undefined) => {
        if (err || !payload || typeof payload === 'string') {
          return res.status(403).send({ message: 'Invalid refresh token!' });
        }

        const user = payload as JWTUser;

        const checkTokenQuery =
          'SELECT * FROM tokens WHERE user_id = ? AND token_type = ? AND is_valid = ?';
        db.query(checkTokenQuery, [user.id, 'refresh', true], (err, results: RowDataPacket[]) => {
          if (err) return res.sendStatus(500);

          if (!results.length) {
            return res.status(403).send({ message: 'Invalid refresh token!' });
          }

          const tokenRecord = results[0];
          const storedEncryptedToken = tokenRecord.token as string;

          if (refreshToken !== storedEncryptedToken) {
            return res.status(403).send({ message: 'Invalid refresh token!' });
          }

          const newAccessToken = getAccessToken({ id: user.id });
          const newRefreshToken = getRefreshToken({ id: user.id });

          const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

          const deleteOldTokenQuery = 'DELETE FROM tokens WHERE user_id = ? AND token_type = ?';
          db.query(deleteOldTokenQuery, [user.id, 'refresh'], (err) => {
            if (err) return res.sendStatus(500);

            const insertTokenQuery =
              'INSERT INTO tokens (user_id, token_type, token, is_valid, expires_at) VALUES (?, ?, ?, ?, ?)';
            db.query(
              insertTokenQuery,
              [user.id, 'refresh', newRefreshToken, true, newExpiresAt],
              (err) => {
                if (err) return res.sendStatus(500);

                return res
                  .status(200)
                  .send({ accessToken: newAccessToken, refreshToken: newRefreshToken });
              },
            );
          });
        });
      },
    );
  } catch (e) {
    return res.sendStatus(500);
  }
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

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const insertTokenQuery = `INSERT INTO tokens (user_id, token_type, token, is_valid, expires_at) VALUES (?, ?, ?, ?, ?)`;

        db.query(insertTokenQuery, [id, 'refresh', refreshToken, true, expiresAt], (err) => {
          if (err) return res.sendStatus(500);

          return res.status(201).send({ accessToken, refreshToken });
        });
      });
    });
  } catch (e) {
    return res.sendStatus(500);
  }
});

usersRouter.get('/info', auth, async (req, res) => {
  try {
    const user = (req as RequestWithUser).user;

    if (!user) {
      return res.status(403).send({ message: 'Token is not correct!' });
    }

    return res.status(200).send({ id: user.id });
  } catch (e) {
    return res.sendStatus(500);
  }
});

usersRouter.get('/logout', auth, async (req, res) => {
  try {
    const user = (req as RequestWithUser).user;

    if (!user) {
      return res.status(403).send({ message: 'Token is not correct!' });
    }

    db.query(
      'DELETE FROM tokens WHERE user_id = ?',
      [user.id],
      (err, result: QueryResult & OkPacketParams) => {
        if (err) {
          return res.sendStatus(500);
        } else if (result.affectedRows === 0) {
          return res.status(404).send({ message: 'Token is not found' });
        }

        return res.sendStatus(200);
      },
    );
  } catch (e) {
    return res.sendStatus(500);
  }
});

usersRouter.get('/table', (req, res) => {
  try {
    db.query(`SELECT * FROM ${req.query.name}`, [], (err, result) => {
      return res.send(result);
    });
  } catch (e) {
    res.sendStatus(500);
  }
});

export default usersRouter;
