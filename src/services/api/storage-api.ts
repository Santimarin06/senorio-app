// Instancia HTTP de Supabase Storage (RF-13). Mismo token que la API REST: la política del
// bucket privado "comprobantes" solo deja subir a la carpeta del propio cliente.
import axios from 'axios';

import { env } from '@/config/env';
import { agregarToken } from '@/services/api/supabase-api';

export const storageApi = axios.create({
  baseURL: `${env.supabaseUrl}/storage/v1`,
  // Subir una foto de hasta 5 MB con datos móviles tarda más que una consulta.
  timeout: 60_000,
  headers: { apikey: env.supabaseAnonKey },
});

storageApi.interceptors.request.use(agregarToken);
