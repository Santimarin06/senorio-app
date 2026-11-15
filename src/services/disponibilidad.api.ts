// Datos de la base para el horario semanal (RF-04). Se piden en paralelo:
// - franjas_ocupadas: citas activas y bloqueos del profesional. Es una función porque la RLS no
//   deja que un cliente lea las citas de otros; solo recibe los rangos ocupados (D-23, D-24).
// - festivos y dias_habilitados de la semana: lectura pública.
import { sumarDias } from '@/lib/disponibilidad';
import { mapDiaHabilitado } from '@/models/disponibilidad.mapper';
import { supabaseApi } from '@/services/api/supabase-api';
import type {
  DiaHabilitadoRespuesta,
  FestivoRespuesta,
  FranjaOcupadaRespuesta,
} from '@/types/api';
import type { OcupacionSemana } from '@/types/entidades';

/** Medianoche de Bogotá de una fecha 'YYYY-MM-DD', como instante ISO. */
const medianocheBogota = (fecha: string) => `${fecha}T00:00:00-05:00`;

export const getOcupacionSemana = async (
  profesionalId: string,
  lunes: string,
): Promise<OcupacionSemana> => {
  const domingo = sumarDias(lunes, 6);
  const rangoFechas = `(fecha.gte.${lunes},fecha.lte.${domingo})`;

  const [ocupadas, festivos, dias] = await Promise.all([
    supabaseApi.post<FranjaOcupadaRespuesta[]>('/rpc/franjas_ocupadas', {
      p_profesional_id: profesionalId,
      p_desde: medianocheBogota(lunes),
      p_hasta: medianocheBogota(sumarDias(lunes, 7)),
    }),
    supabaseApi.get<FestivoRespuesta[]>('/festivos', {
      params: { select: 'fecha,nombre', and: rangoFechas },
    }),
    supabaseApi.get<DiaHabilitadoRespuesta[]>('/dias_habilitados', {
      params: { select: 'fecha,abierto,apertura,cierre,nota', and: rangoFechas },
    }),
  ]);

  return {
    ocupadas: ocupadas.data.map(({ inicio, fin }) => ({ inicio, fin })),
    festivos: festivos.data.map((f) => f.fecha),
    especiales: dias.data.map(mapDiaHabilitado),
  };
};
