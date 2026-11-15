// Cliente HTTP de Supabase Auth (GoTrue), por HTTP como el resto de Supabase (sin SDK).
import axios from 'axios';

import { env } from '@/config/env';

export const authApi = axios.create({
  baseURL: `${env.supabaseUrl}/auth/v1`,
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    apikey: env.supabaseAnonKey,
  },
});
