import type { DatosPerfil } from '@/lib/sesion';
import { mapPerfil } from '@/models/sesion.mapper';
import { supabaseApi } from '@/services/api/supabase-api';
import type { PerfilRespuesta } from '@/types/api';
import type { Usuario } from '@/types/sesion';

/** Perfil del usuario que acaba de iniciar sesión (la RLS solo deja leer el propio). */
export const getPerfil = async (usuarioId: string, accessToken: string): Promise<Usuario> => {
  const { data } = await supabaseApi.get<PerfilRespuesta[]>('/perfiles', {
    params: { select: 'id,nombre,telefono,correo,rol,profesional_id', id: `eq.${usuarioId}` },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const perfil = data[0];
  if (!perfil) throw new Error('No encontramos tu perfil. Escríbenos por WhatsApp.');
  return mapPerfil(perfil);
};

/**
 * RF-15, "Editar mis datos": la base solo deja cambiar nombre y teléfono del perfil propio
 * (permiso de columna y RLS). Devuelve el perfil que quedó guardado, no lo que se escribió.
 */
export const actualizarPerfil = async (usuarioId: string, datos: DatosPerfil): Promise<Usuario> => {
  const { data } = await supabaseApi.patch<PerfilRespuesta[]>(
    '/perfiles',
    { nombre: datos.nombre, telefono: datos.telefono },
    {
      params: { select: 'id,nombre,telefono,correo,rol,profesional_id', id: `eq.${usuarioId}` },
      headers: { Prefer: 'return=representation' },
    },
  );
  const perfil = data[0];
  // Sin fila de vuelta la RLS no dejó guardar: no se muestra como guardado (RN-14).
  if (!perfil) throw new Error('No pudimos guardar tus datos. Inténtalo de nuevo.');
  return mapPerfil(perfil);
};
