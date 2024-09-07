export interface User {
  id: string;
  password: string;
}

export type JWTUser = Omit<User, 'password'>;
