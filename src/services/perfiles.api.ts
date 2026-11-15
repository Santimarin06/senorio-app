import { mapPerfil } from '@/models/sesion.mapper';
import { supabaseApi } from '@/services/api/supabase-api';
import type { PerfilRespuesta } from '@/types/api';
import type { Usuario } from '@/types/sesion';

/** Perfil del usuario que acaba de iniciar sesión (la RLS solo deja leer el propio). */
export const getPerfil = async (usuarioId: string, accessToken: string): Promise<Usuario> => {
  const { data } = await supabaseApi.get<PerfilRespuesta[]>('/perfiles', {
    params: { select: 'id,nombre,telefono,correo,rol', id: `eq.${usuarioId}` },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const perfil = data[0];
  if (!perfil) throw new Error('No encontramos tu perfil. Escríbenos por WhatsApp.');
  return mapPerfil(perfil);
};
