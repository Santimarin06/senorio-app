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

/**
 * Mensaje al marcar asistencia (RF-23). La pantalla no cambia nada si falla, así que el
 * mensaje aclara que la cita sigue igual (RN-12, RN-14).
 */
export const mensajeDeAsistencia = (error: unknown): string => {
  switch (clasificarError(error)) {
    case 'sin-conexion':
      return 'No hay conexión. La cita sigue igual; inténtalo de nuevo cuando tengas internet.';
    case 'configuracion':
      return mensajeDeError(error);
    default:
      return (
        textoDeRegla(error) ?? 'No pudimos guardar la asistencia. La cita sigue igual; inténtalo de nuevo.'
      );
  }
};

/**
 * Mensaje al enviar o reemplazar un comprobante (RF-13). Siempre aclara que no quedó nada
 * registrado, porque un fallo en la subida o en el registro deja el anticipo como estaba.
 */
export const mensajeDeComprobante = (error: unknown): string => {
  switch (clasificarError(error)) {
    case 'sin-conexion':
      return 'No hay conexión. No se envió nada; inténtalo de nuevo cuando tengas internet.';
    case 'configuracion':
      return mensajeDeError(error);
    default: {
      const estado = isAxiosError(error) ? error.response?.status : undefined;
      const c = cuerpo(error);
      const mensaje = c?.message ?? '';
      if (estado === 413 || /exceeded the maximum allowed size/i.test(mensaje)) {
        return 'La imagen supera los 5 MB. No se envió nada; elige otra.';
      }
      if (estado === 415 || /mime type/i.test(mensaje)) {
        return 'Solo se aceptan imágenes JPG o PNG. No se envió nada; elige otra.';
      }
      // Índice comprobantes_un_vigente_por_cita: ya hay uno pendiente o aprobado.
      if (c?.code === '23505') return 'Ya tienes un comprobante en revisión o aprobado para esta cita.';
      const regla = textoDeRegla(error);
      if (regla) return regla;
      if (mensaje === 'No encontramos esta cita.' || mensaje === 'No encontramos este comprobante.') {
        return mensaje;
      }
      return 'No pudimos guardar el comprobante. No se envió nada; inténtalo de nuevo.';
    }
  }
};

/**
 * Mensaje al guardar o quitar un horario especial o un bloqueo (RF-24). Aclara que nada
 * cambió, porque la pantalla solo muestra lo que la base confirmó (RN-12, RN-14).
 */
export const mensajeDeDiasTrabajo = (error: unknown): string => {
  switch (clasificarError(error)) {
    case 'sin-conexion':
      return 'No hay conexión. No se guardó nada; inténtalo de nuevo cuando tengas internet.';
    case 'configuracion':
      return mensajeDeError(error);
    default: {
      const c = cuerpo(error);
      // Check de la tabla: apertura < cierre, fin > inicio.
      if (c?.code === '23514') return 'La hora final debe ser posterior a la inicial.';
      // RLS: solo el administrador escribe en estas tablas.
      if (c?.code === '42501') return 'Solo el administrador puede cambiar los días de trabajo.';
      if (error instanceof Error && error.message.startsWith('No encontramos')) return error.message;
      return 'No pudimos guardar el cambio. Nada cambió; inténtalo de nuevo.';
    }
  }
};

/**
 * Mensaje al confirmar o rechazar un comprobante, resolver una multa o registrar una
 * devolución (RF-25, RF-28). Aclara que nada cambió, porque la pantalla solo muestra lo que
 * la base confirmó (RN-12, RN-14).
 */
export const mensajeDeRevision = (error: unknown): string => {
  switch (clasificarError(error)) {
    case 'sin-conexion':
      return 'No hay conexión. No se guardó nada; inténtalo de nuevo cuando tengas internet.';
    case 'configuracion':
      return mensajeDeError(error);
    default: {
      const c = cuerpo(error);
      // RLS o permisos de columna: solo el administrador revisa.
      if (c?.code === '42501') return 'Solo el administrador puede hacer esta revisión.';
      // Check devolucion_monto <= monto.
      if (c?.code === '23514') return 'La devolución no puede superar el anticipo.';
      const regla = textoDeRegla(error);
      if (regla) return regla;
      // Errores propios del servicio: otra persona ya lo resolvió.
      if (error instanceof Error && / ya (fue|estaba) /.test(error.message)) return error.message;
      return 'No pudimos guardar el cambio. Nada cambió; inténtalo de nuevo.';
    }
  }
};

/**
 * Mensaje al guardar, desactivar o reactivar un servicio o un producto, o al subir su foto
 * (RF-26, RF-27). Aclara que nada cambió: la pantalla solo muestra lo que la base confirmó
 * (RN-12, RN-14).
 */
export const mensajeDeGestion = (error: unknown): string => {
  switch (clasificarError(error)) {
    case 'sin-conexion':
      return 'No hay conexión. No se guardó nada; inténtalo de nuevo cuando tengas internet.';
    case 'configuracion':
      return mensajeDeError(error);
    default: {
      const estado = isAxiosError(error) ? error.response?.status : undefined;
      const c = cuerpo(error);
      const mensaje = c?.message ?? '';
      if (estado === 413 || /exceeded the maximum allowed size/i.test(mensaje)) {
        return 'La foto supera el tamaño máximo. No se guardó nada; elige otra.';
      }
      if (estado === 415 || /mime type/i.test(mensaje)) {
        return 'Solo se aceptan fotos JPG o PNG. No se guardó nada; elige otra.';
      }
      if (c?.code === '42501' || estado === 403) return 'Solo el administrador puede cambiar el catálogo.';
      if (c?.code === '23514') return 'Algún dato no es válido. Revisa el formulario.';
      // La función guardar_servicio todavía no existe en la base (migración sin aplicar).
      if (c?.code === 'PGRST202') return 'La base aún no tiene la función para guardar servicios.';
      const regla = textoDeRegla(error);
      if (regla) return regla;
      if (error instanceof Error && error.message.startsWith('No encontramos')) return error.message;
      return 'No pudimos guardar el cambio. Nada cambió; inténtalo de nuevo.';
    }
  }
};

/** RF-15: mensaje al guardar nombre y teléfono. Aclara que nada cambió (RN-14). */
export const mensajeDePerfil = (error: unknown): string => {
  switch (clasificarError(error)) {
    case 'sin-conexion':
      return 'No hay conexión. Tus datos no se guardaron; inténtalo de nuevo cuando tengas internet.';
    case 'configuracion':
      return mensajeDeError(error);
    default: {
      // Permiso de columna o RLS: solo se editan nombre y teléfono del perfil propio.
      if (cuerpo(error)?.code === '42501') return 'Solo puedes cambiar tu nombre y tu teléfono.';
      if (error instanceof Error && !isAxiosError(error)) return error.message;
      return 'No pudimos guardar tus datos. Nada cambió; inténtalo de nuevo.';
    }
  }
};
