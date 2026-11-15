// Acciones de Supabase Auth (RF-01): registro, inicio de sesión, renovación y cierre.
import { mapTokens, traeSesion } from '@/models/sesion.mapper';
import { authApi } from '@/services/api/auth-api';
import type { RegistroRespuesta, TokenRespuesta } from '@/types/api';
import type { Tokens } from '@/types/sesion';

export interface NuevoCliente {
  nombre: string;
  telefono: string;
  correo: string;
  contrasena: string;
}

/**
 * Crea la cuenta. nombre y telefono viajan como metadatos y el trigger de la base los copia a
 * perfiles con rol cliente. Devuelve null cuando el proyecto exige confirmar el correo.
 */
export const registrar = async (
  c: NuevoCliente,
): Promise<{ tokens: Tokens; usuarioId: string } | null> => {
  const { data } = await authApi.post<RegistroRespuesta>('/signup', {
    email: c.correo,
    password: c.contrasena,
    data: { nombre: c.nombre, telefono: c.telefono },
  });
  return traeSesion(data) ? { tokens: mapTokens(data, Date.now()), usuarioId: data.user.id } : null;
};

export const iniciarSesion = async (
  correo: string,
  contrasena: string,
): Promise<{ tokens: Tokens; usuarioId: string }> => {
  const { data } = await authApi.post<TokenRespuesta>(
    '/token',
    { email: correo, password: contrasena },
    { params: { grant_type: 'password' } },
  );
  return { tokens: mapTokens(data, Date.now()), usuarioId: data.user.id };
};

export const renovar = async (refreshToken: string): Promise<Tokens> => {
  const { data } = await authApi.post<TokenRespuesta>(
    '/token',
    { refresh_token: refreshToken },
    { params: { grant_type: 'refresh_token' } },
  );
  return mapTokens(data, Date.now());
};

/** Revoca la sesión en el servidor. Si falla (sin conexión), la app cierra la sesión local igual. */
export const cerrarSesionRemota = async (accessToken: string): Promise<void> => {
  await authApi.post('/logout', null, {
    params: { scope: 'local' },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
};
