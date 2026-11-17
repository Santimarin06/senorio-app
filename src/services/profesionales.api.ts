// Acciones HTTP de profesionales (como movie.api.ts en 06-Peliculas):
// piden los datos, los pasan por el mapper y devuelven el modelo interno.
import { esUuid } from '@/lib/ids';
import {
  mapCuenta,
  mapProfesional,
  mapProfesionalDetalle,
  mapProfesionalGestion,
  profesionalACuerpo,
} from '@/models/profesional.mapper';
import { mapServicio, mapServicioGestion, servicioACuerpo } from '@/models/servicio.mapper';
import { supabaseApi } from '@/services/api/supabase-api';
import type {
  CuentaRespuesta,
  ProfesionalDetalleRespuesta,
  ProfesionalGestionRespuesta,
  ProfesionalRespuesta,
  ServicioGestionRespuesta,
  ServicioRespuesta,
} from '@/types/api';
import type {
  CuentaUsuario,
  Profesional,
  ProfesionalDetalle,
  ProfesionalFormulario,
  ProfesionalGestion,
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

// ---------------------------------------------------------------------------------------------
// Gestión de profesionales del administrador (RF-29, D-13, D-46). La persona se registra como
// cliente y el administrador vincula su cuenta a la ficha con guardar_profesional, que llama a
// asignar_rol. La app nunca usa la service_role key: todo pasa por la RLS del administrador.
// ---------------------------------------------------------------------------------------------

const SELECT_PROFESIONAL_GESTION =
  'id,nombre,cargo,foto_url,activo,servicios(id,nombre,es_adicional,activo),perfiles(id,nombre,correo,telefono)';

/** Todas las fichas (activas e inactivas) con sus servicios y la cuenta vinculada. */
export const getProfesionalesGestion = async (): Promise<ProfesionalGestion[]> => {
  const { data } = await supabaseApi.get<ProfesionalGestionRespuesta[]>('/profesionales', {
    params: { select: SELECT_PROFESIONAL_GESTION, order: 'nombre.asc' },
  });
  return data.map(mapProfesionalGestion);
};

/**
 * Cuentas que aún no tienen ficha: los usuarios con rol cliente. La política "Ver perfiles
 * permitidos" ya deja al administrador leer todos los perfiles, así que no hace falta otra RPC.
 */
export const getCuentasSinFicha = async (): Promise<CuentaUsuario[]> => {
  const { data } = await supabaseApi.get<CuentaRespuesta[]>('/perfiles', {
    params: { select: 'id,nombre,correo,telefono', rol: 'eq.cliente', order: 'nombre.asc' },
  });
  return data.map(mapCuenta);
};

/**
 * Crea (id null) o edita una ficha, reemplaza sus servicios y, si se eligió una cuenta, le
 * asigna el rol profesional, todo en una transacción con la función guardar_profesional.
 */
export const guardarProfesional = async (
  id: string | null,
  f: ProfesionalFormulario,
): Promise<Profesional> => {
  const { data } = await supabaseApi.post<ProfesionalRespuesta | null>(
    '/rpc/guardar_profesional',
    profesionalACuerpo(id, f),
  );
  if (!data) throw new Error('No se guardó el profesional.');
  return mapProfesional(data);
};

/** Desactiva o reactiva una ficha. Nunca se borra: las citas la nombran. */
export const cambiarActivoProfesional = async (id: string, activo: boolean): Promise<void> => {
  const { data } = await supabaseApi.patch<{ id: string }[]>(
    '/profesionales',
    { activo },
    { params: { id: `eq.${id}`, select: 'id' }, headers: { Prefer: 'return=representation' } },
  );
  if (data.length === 0) throw new Error('No encontramos este profesional.');
};
