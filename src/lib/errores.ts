// Clasifica un error de petición para mostrar el mensaje correcto (RN-14).
import { isAxiosError } from 'axios';

import { faltaConfiguracion } from '@/config/env';

export type TipoError = 'sin-conexion' | 'configuracion' | 'servidor';

export const clasificarError = (error: unknown): TipoError => {
  if (faltaConfiguracion) return 'configuracion';
  // Axios sin respuesta = la petición no llegó al servidor (sin internet o tiempo agotado).
  if (isAxiosError(error) && !error.response) return 'sin-conexion';
  return 'servidor';
};

export const mensajeDeError = (error: unknown): string => {
  switch (clasificarError(error)) {
    case 'sin-conexion':
      return 'No hay conexión. Revisa tu internet e inténtalo de nuevo.';
    case 'configuracion':
      return 'La app no está configurada: faltan los datos de Supabase en .env.';
    default:
      return 'No pudimos cargar la información. Inténtalo de nuevo.';
  }
};
