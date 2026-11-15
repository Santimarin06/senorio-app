// Flujo de la sesión (RF-01): restaurar al abrir la app, iniciar, registrar y cerrar.
import { normalizarCorreo, normalizarTelefono } from '@/lib/sesion';
import { borrarSesion, guardarSesion, leerSesion } from '@/services/almacenamientoSesion';
import { cerrarSesionRemota, iniciarSesion, registrar, type NuevoCliente } from '@/services/auth.api';
import { getPerfil } from '@/services/perfiles.api';
import { useSesionStore } from '@/store/useSesionStore';
import type { Usuario } from '@/types/sesion';

/**
 * Al abrir la app: si hay una sesión guardada se usa tal cual, sin esperar a la red, para que
 * la persona vea sus datos aunque esté sin conexión. El token se renueva en la primera petición.
 */
export async function restaurarSesion(): Promise<void> {
  try {
    const guardada = await leerSesion();
    if (guardada) useSesionStore.getState().establecer(guardada.usuario, guardada.tokens);
  } finally {
    useSesionStore.getState().marcarRestaurada();
  }
}

export async function entrar(correo: string, contrasena: string): Promise<Usuario> {
  const { tokens, usuarioId } = await iniciarSesion(normalizarCorreo(correo), contrasena);
  const usuario = await getPerfil(usuarioId, tokens.accessToken);
  await guardarSesion(tokens, usuario);
  useSesionStore.getState().establecer(usuario, tokens);
  return usuario;
}

/**
 * Crea la cuenta del cliente. Devuelve 'confirmar-correo' cuando Supabase pide confirmarlo
 * antes de entrar (configuración actual del proyecto) o 'lista' si quedó con sesión.
 */
export async function registrarCliente(c: NuevoCliente): Promise<'confirmar-correo' | 'lista'> {
  const resultado = await registrar({
    nombre: c.nombre.trim(),
    telefono: normalizarTelefono(c.telefono),
    correo: normalizarCorreo(c.correo),
    contrasena: c.contrasena,
  });
  if (!resultado) return 'confirmar-correo';
  const { tokens, usuarioId } = resultado;
  const usuario = await getPerfil(usuarioId, tokens.accessToken);
  await guardarSesion(tokens, usuario);
  useSesionStore.getState().establecer(usuario, tokens);
  return 'lista';
}

/** Cierra la sesión local siempre; la revocación en el servidor es mejor esfuerzo. */
export async function salir(): Promise<void> {
  const tokens = useSesionStore.getState().tokens;
  useSesionStore.getState().limpiar();
  await borrarSesion();
  if (tokens) {
    try {
      await cerrarSesionRemota(tokens.accessToken);
    } catch {
      // Sin conexión: el token vence solo en una hora y ya no está guardado en el teléfono.
    }
  }
}
