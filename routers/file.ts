import path from 'path';
import * as fs from 'node:fs';
import express from 'express';
import { RowDataPacket } from 'mysql2';
import { db } from '../index';
import config from '../config';
import { filesUpload } from '../multer';
import { FileInfo } from '../types';

const fileRouter = express.Router();

fileRouter.post('/upload', filesUpload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ message: 'No file' });
    }

    const fileInfo: FileInfo = {
      filename: req.file.filename,
      ext: path.extname(req.file.filename).split('.').pop() + '',
      mimetype: req.file.mimetype,
      size: req.file.size,
      date: new Date().toISOString(),
      originalName: req.file.originalname,
    };

    const query = `INSERT INTO files (filename, ext, mimetype, size, date, original_name) VALUES (?, ?, ?, ?, ?, ?)`;

    db.query(query, Object.values(fileInfo), (err) => {
      if (err) return res.sendStatus(500);

      return res.sendStatus(201);
    });
  } catch (e) {
    return res.sendStatus(500);
  }
});

fileRouter.get('/list', (req, res) => {
  try {
    const { list_size = 10, page = 1 } = req.query as unknown as {
      list_size: string;
      page: string;
    };

    const offset = (Number(page) - 1) * Number(list_size);

    const query = `SELECT * FROM files LIMIT ${list_size} OFFSET ${offset}`;

    db.query(query, (err, result) => {
      if (err) return res.sendStatus(500);

      return res.send(result);
    });
  } catch (e) {
    return res.sendStatus(500);
  }
});

fileRouter.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    db.query('SELECT * FROM files WHERE id = ?', [id], (err, result: RowDataPacket[]) => {
      if (err) return res.sendStatus(500);

      if (!result.length) {
        return res.status(404).send({ message: 'file is not found' });
      }

      const file = result[0] as FileInfo;

      const filePath = path.join(config.publicPath, file.ext, file.filename);

      db.query('DELETE FROM files WHERE id = ?', [id], (err) => {
        if (err) return res.sendStatus(500);

        fs.unlink(filePath, (err) => err && console.log(err));

        return res.sendStatus(200);
      });
    });
  } catch (e) {
    return res.sendStatus(500);
  }
});

fileRouter.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    db.query('SELECT * FROM files WHERE id = ?', [id], (err, result: RowDataPacket[]) => {
      if (err) {
        return res.sendStatus(500);
      }

      if (!result.length) {
        return res.status(404).send({ message: 'file is not found' });
      }

      return res.send(result[0]);
    });
  } catch (e) {
    return res.sendStatus(500);
  }
});

fileRouter.get('/download/:id', (req, res) => {
  try {
    const { id } = req.params;

    db.query('SELECT * FROM files WHERE id = ?', [id], (err, result: RowDataPacket[]) => {
      if (err) {
        return res.sendStatus(500);
      }

      if (!result.length) {
        return res.status(404).send({ message: 'file is not found' });
      }

      const file = result[0] as FileInfo;

      const filePath = path.join(config.publicPath, file.ext, file.filename);

      return res.download(filePath, (err) => {
        if (err) {
          return res.sendStatus(500);
        }
      });
    });
  } catch (e) {
    return res.sendStatus(500);
  }
});

fileRouter.put('/update/:id', filesUpload.single('file'), (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).send({ message: 'No file' });
    }

    const newFile: FileInfo = {
      filename: req.file.filename,
      ext: path.extname(req.file.filename).split('.').pop() + '',
      mimetype: req.file.mimetype,
      size: req.file.size,
      date: new Date().toISOString(),
      originalName: req.file.originalname,
    };

    db.query('SELECT * FROM files WHERE id = ?', [id], (err, result: RowDataPacket[]) => {
      if (err) {
        return res.sendStatus(500);
      }

      if (!result.length) {
        const newFilePath = path.join(config.publicPath, newFile.ext, newFile.filename);
        fs.unlink(newFilePath, (err) => err && console.log(err));
        return res.status(404).send({ message: 'file is not found' });
      }

      const file = result[0] as FileInfo;

      const filePath = path.join(config.publicPath, file.ext, file.filename);

      fs.unlink(filePath, (err) => err && console.log(err));

      db.query(
        'UPDATE files SET filename = ?, ext = ?, mimetype = ?, size = ?, date = ?, original_name = ? WHERE id = ?',
        [...Object.values(newFile), id],
        (err) => {
          if (err) {
            return res.sendStatus(500);
          }

          return res.sendStatus(200);
        },
      );
    });
  } catch (e) {
    return res.sendStatus(500);
  }
});

export default fileRouter;
