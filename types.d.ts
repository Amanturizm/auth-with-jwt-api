export interface User {
  id: string;
  password: string;
}

export type JWTUser = Omit<User, 'password'>;

export interface FileInfo {
  filename: string;
  ext: string;
  mimetype: string;
  size: number;
  date: string;
  originalName: string;
}
