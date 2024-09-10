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

export interface Token {
  user_id: string;
  token_type: string;
  token: string;
  is_valid: number;
  created_at: string;
  expires_at: string;
}
