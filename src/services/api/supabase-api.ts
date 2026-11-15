// Servicio HTTP único (como movie-api.ts en 06-Peliculas).
// Supabase se consume por su API REST (PostgREST): cada tabla es un recurso.
// Con sesión, cada petición lleva el token del usuario y la RLS decide qué puede ver;
// sin sesión va la anon key (solo lo público: catálogo, festivos, franjas ocupadas).
import axios from 'axios';

import { env } from '@/config/env';
import { tokenVigente } from '@/services/token';

export const supabaseApi = axios.create({
  baseURL: `${env.supabaseUrl}/rest/v1`,
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
    apikey: env.supabaseAnonKey,
  },
});

supabaseApi.interceptors.request.use(async (config) => {
  // Una petición puede traer su propio token (justo después de iniciar sesión).
  if (!config.headers.Authorization) {
    const token = await tokenVigente();
    config.headers.Authorization = `Bearer ${token ?? env.supabaseAnonKey}`;
  }
  return config;
});
