// Acciones HTTP de profesionales (como movie.api.ts en 06-Peliculas):
// piden los datos, los pasan por el mapper y devuelven el modelo interno.
import { esUuid } from '@/lib/ids';
import { mapProfesional, mapProfesionalDetalle } from '@/models/profesional.mapper';
import { supabaseApi } from '@/services/api/supabase-api';
import type { ProfesionalDetalleRespuesta, ProfesionalRespuesta } from '@/types/api';
import type { Profesional, ProfesionalDetalle } from '@/types/entidades';

/** Listado de profesionales activos, por nombre. */
export const getProfesionales = async (): Promise<Profesional[]> => {
  const { data } = await supabaseApi.get<ProfesionalRespuesta[]>('/profesionales', {
    params: { select: 'id,nombre,cargo,foto_url,activo', activo: 'eq.true', order: 'nombre.asc' },
  });
  return data.map(mapProfesional);
};

/** Detalle por id con sus servicios. Devuelve null si el id no existe. */
export const getProfesionalById = async (id: string): Promise<ProfesionalDetalle | null> => {
  if (!esUuid(id)) return null;

  const { data } = await supabaseApi.get<ProfesionalDetalleRespuesta[]>('/profesionales', {
    params: {
      select: 'id,nombre,cargo,foto_url,activo,servicios(*)',
      id: `eq.${id}`,
      activo: 'eq.true',
    },
  });
  const profesional = data[0];
  return profesional ? mapProfesionalDetalle(profesional) : null;
};
