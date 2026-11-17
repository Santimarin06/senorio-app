import type { PerfilRespuesta, RegistroRespuesta, TokenRespuesta } from '@/types/api';
import type { Rol, Tokens, Usuario } from '@/types/sesion';

const ROLES: readonly Rol[] = ['cliente', 'profesional', 'administrador'];

/** expires_in llega en segundos; se guarda el instante de vencimiento en milisegundos. */
export const mapTokens = (respuesta: TokenRespuesta, ahoraMs: number): Tokens => ({
  accessToken: respuesta.access_token,
  refreshToken: respuesta.refresh_token,
  expiraEn: ahoraMs + respuesta.expires_in * 1000,
});

export const traeSesion = (respuesta: RegistroRespuesta): respuesta is TokenRespuesta =>
  'access_token' in respuesta && typeof respuesta.access_token === 'string';

export const mapPerfil = (perfil: PerfilRespuesta): Usuario => ({
  id: perfil.id,
  nombre: perfil.nombre.trim() === '' ? 'Cliente' : perfil.nombre,
  // Un rol desconocido nunca da más permisos: se trata como cliente. La RLS decide igual.
  rol: (ROLES as readonly string[]).includes(perfil.rol) ? (perfil.rol as Rol) : 'cliente',
  correo: perfil.correo ?? '',
  telefono: perfil.telefono ?? '',
  profesionalId: perfil.rol === 'profesional' ? perfil.profesional_id : null,
});
