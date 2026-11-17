// Clasifica un error de petición para mostrar el mensaje correcto (RN-14).
import { isAxiosError } from 'axios';

import { faltaConfiguracion } from '@/config/env';
import type { ErrorApiRespuesta } from '@/types/api';

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

/** Cuerpo del error que devolvió Supabase, si lo hay. */
const cuerpo = (error: unknown): ErrorApiRespuesta | null => {
  if (!isAxiosError(error)) return null;
  const data: unknown = error.response?.data;
  return data && typeof data === 'object' ? (data as ErrorApiRespuesta) : null;
};

/** RF-01: mensajes de Supabase Auth en palabras del cliente. */
export const mensajeDeAuth = (error: unknown): string => {
  if (clasificarError(error) !== 'servidor') return mensajeDeError(error);
  const c = cuerpo(error);
  switch (c?.error_code) {
    case 'invalid_credentials':
      return 'El correo o la contraseña no coinciden.';
    case 'email_not_confirmed':
      return 'Confirma tu correo con el enlace que te enviamos y vuelve a intentarlo.';
    case 'user_already_exists':
    case 'email_exists':
      return 'Ya existe una cuenta con ese correo. Inicia sesión.';
    // El servicio de correo de Supabase rechaza direcciones a las que no puede enviar la
    // confirmación (por ejemplo, correos inventados para probar).
    case 'email_address_invalid':
    case 'email_address_not_authorized':
      return 'No podemos enviar la confirmación a ese correo. Usa un correo real tuyo.';
    case 'weak_password':
      return 'La contraseña es muy débil. Usa una más larga.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Se alcanzó el límite de correos de confirmación. Espera una hora e inténtalo de nuevo.';
    default:
      return 'No pudimos completar la solicitud. Inténtalo de nuevo.';
  }
};

/** La base rechazó la reserva porque otro cliente tomó la franja (RN-02, restricción de exclusión). */
export const esFranjaTomada = (error: unknown): boolean =>
  (cuerpo(error)?.message ?? '').startsWith('RN-02');

/**
 * Mensaje de reservar_cita. Las reglas de la base llegan como "RN-07: texto"; se muestra el
 * texto sin el código. Cualquier otro error usa el mensaje general.
 */
export const mensajeDeReserva = (error: unknown): string => {
  if (clasificarError(error) !== 'servidor') return mensajeDeError(error);
  if (esFranjaTomada(error)) return 'Esa franja acaba de ser tomada. Elige otra.';
  const regla = textoDeRegla(error);
  if (regla) return regla;
  const mensaje = cuerpo(error)?.message ?? '';
  if (mensaje === 'La hora elegida ya pasó.') return mensaje;
  return 'No pudimos registrar la cita. Inténtalo de nuevo.';
};

/** Texto de un error de regla de la base ("RN-07: texto" → "Texto"), o null si no lo es. */
const textoDeRegla = (error: unknown): string | null => {
  const regla = /^(?:RN|RF|D)-\d+:\s*(.+)$/.exec(cuerpo(error)?.message ?? '');
  return regla?.[1] ? regla[1].charAt(0).toUpperCase() + regla[1].slice(1) : null;
};

/** Mensaje de cancelar_cita. Sin conexión se aclara que la cita no cambió (RN-14). */
export const mensajeDeCancelacion = (error: unknown): string => {
  switch (clasificarError(error)) {
    case 'sin-conexion':
      return 'No hay conexión. Tu cita sigue igual; inténtalo de nuevo cuando tengas internet.';
    case 'configuracion':
      return mensajeDeError(error);
    default: {
      const regla = textoDeRegla(error);
      if (regla) return regla;
      if (cuerpo(error)?.message === 'No encontramos esta cita.') return 'No encontramos esta cita.';
      return 'No pudimos cancelar la cita. Tu cita sigue igual; inténtalo de nuevo.';
    }
  }
};
