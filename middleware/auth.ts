import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { JWTUser } from '../types';

export interface RequestWithUser extends Request {
  user?: JWTUser;
}

const auth = (req: RequestWithUser, res: Response, next: NextFunction) => {
  const token = req.get('Authorization')?.split(' ')[1];

  if (!token) {
    return res.status(401).send({ error: 'No token!' });
  }

  jwt.verify(token, config.accessSecretKey, (err, user) => {
    if (err) return res.sendStatus(403);

    req.user = user as JWTUser;

    next();
  });
};

export default auth;
