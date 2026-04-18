import { config } from 'dotenv';
import { OpenAI } from 'openai';

config();

export const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || 'sk-3ed32c466599404485af08dc3192b3ff',
  baseURL: 'https://api.deepseek.com/v1',
});
