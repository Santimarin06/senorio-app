// Acciones HTTP de profesionales (como movie.api.ts en 06-Peliculas):
// piden los datos, los pasan por el mapper y devuelven el modelo interno.
import { esUuid } from '@/lib/ids';
import { mapProfesional, mapProfesionalDetalle } from '@/models/profesional.mapper';
import { mapServicio, mapServicioGestion, servicioACuerpo } from '@/models/servicio.mapper';
import { supabaseApi } from '@/services/api/supabase-api';
import type {
  ProfesionalDetalleRespuesta,
  ProfesionalRespuesta,
  ServicioGestionRespuesta,
  ServicioRespuesta,
} from '@/types/api';
import type {
  Profesional,
  ProfesionalDetalle,
  Servicio,
  ServicioFormulario,
  ServicioGestion,
} from '@/types/entidades';

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

// ---------------------------------------------------------------------------------------------
// Gestión de servicios del administrador (RF-26, D-43). Los servicios viven aquí porque llegan
// por la relación profesional_servicios. La RLS solo deja al administrador ver los inactivos y
// escribir; cada escritura pide la fila de vuelta y, si no llega, nada se guardó (RN-12).
// ---------------------------------------------------------------------------------------------

const SELECT_SERVICIO_GESTION =
  'id,nombre,descripcion,duracion_min,precio,es_adicional,activo,profesionales(id,nombre,activo)';

/** Todos los servicios (activos e inactivos) con quién los presta. */
export const getServiciosGestion = async (): Promise<ServicioGestion[]> => {
  const { data } = await supabaseApi.get<ServicioGestionRespuesta[]>('/servicios', {
    params: { select: SELECT_SERVICIO_GESTION, order: 'nombre.asc' },
  });
  return data.map(mapServicioGestion);
};

/**
 * Crea (id null) o edita un servicio y reemplaza sus profesionales en una sola transacción con
 * la función guardar_servicio: por HTTP serían tres peticiones que podrían quedar a medias.
 */
export const guardarServicio = async (id: string | null, f: ServicioFormulario): Promise<Servicio> => {
  const { data } = await supabaseApi.post<ServicioRespuesta | null>(
    '/rpc/guardar_servicio',
    servicioACuerpo(id, f),
  );
  if (!data) throw new Error('No se guardó el servicio.');
  return mapServicio(data);
};

/** Desactiva o reactiva un servicio. Nunca se borra: las citas pasadas lo nombran. */
export const cambiarActivoServicio = async (id: string, activo: boolean): Promise<void> => {
  const { data } = await supabaseApi.patch<{ id: string }[]>(
    '/servicios',
    { activo },
    { params: { id: `eq.${id}`, select: 'id' }, headers: { Prefer: 'return=representation' } },
  );
  if (data.length === 0) throw new Error('No encontramos este servicio.');
};
