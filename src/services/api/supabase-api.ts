// Servicio HTTP único (como movie-api.ts en 06-Peliculas).
// Supabase se consume por su API REST (PostgREST): cada tabla es un recurso.
import axios from 'axios';

import { env } from '@/config/env';

export const supabaseApi = axios.create({
  baseURL: `${env.supabaseUrl}/rest/v1`,
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
    apikey: env.supabaseAnonKey,
    Authorization: `Bearer ${env.supabaseAnonKey}`,
  },
});
