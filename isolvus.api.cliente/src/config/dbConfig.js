// src/config/dbConfig.js

import 'dotenv/config';

export const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT,
};
