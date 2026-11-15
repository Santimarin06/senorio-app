// Acciones HTTP de citas. La tabla `citas` la crea RF-05; mientras no exista, Supabase
// responde 404 y la cita se trata como inexistente (D-21).
import { isAxiosError } from 'axios';

import { esUuid } from '@/lib/ids';
import { mapCita } from '@/models/cita.mapper';
import { supabaseApi } from '@/services/api/supabase-api';
import type { CitaRespuesta } from '@/types/api';
import type { Cita } from '@/types/entidades';

/** Detalle por id. Devuelve null si el id no existe o el usuario no puede verla (RLS). */
export const getCitaById = async (id: string): Promise<Cita | null> => {
  if (!esUuid(id)) return null;

  try {
    const { data } = await supabaseApi.get<CitaRespuesta[]>('/citas', {
      params: { select: 'id,inicio,fin,estado,total,profesionales(nombre)', id: `eq.${id}` },
    });
    const cita = data[0];
    return cita ? mapCita(cita) : null;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error; // sin conexión o fallo del servidor: la pantalla muestra error con reintento
  }
};
