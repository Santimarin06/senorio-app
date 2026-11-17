// Mapper de los avisos del profesional (RF-30, D-47): de la fila de notificaciones con su cita
// (snake_case) al modelo de la app.
import type { NotificacionRespuesta } from '@/types/api';
import type { Aviso, TipoAviso } from '@/types/entidades';

/** Columnas del aviso. La cita trae el cliente por la llave cliente_id y sus servicios. */
export const SELECT_AVISO =
  'id,tipo,creada_en,mostrada_en,leida_en,' +
  'citas(id,inicio,cliente:perfiles!cliente_id(nombre),cita_servicios(nombre))';

const TIPOS: readonly TipoAviso[] = ['cita_nueva', 'cita_reagendada', 'cita_cancelada'];

/** Un tipo desconocido se muestra como cita nueva: es el aviso más general. */
const aTipoAviso = (valor: string): TipoAviso =>
  TIPOS.find((t) => t === valor) ?? 'cita_nueva';

export const mapAviso = (fila: NotificacionRespuesta): Aviso => ({
  id: fila.id,
  tipo: aTipoAviso(fila.tipo),
  creadaEn: fila.creada_en,
  mostrada: fila.mostrada_en !== null,
  leida: fila.leida_en !== null,
  cita: fila.citas
    ? {
        id: fila.citas.id,
        inicio: fila.citas.inicio,
        // Sin perfil visible o sin nombre se muestra "Cliente", como en la agenda.
        cliente: fila.citas.cliente?.nombre.trim() || 'Cliente',
        servicios: (fila.citas.cita_servicios ?? []).map((s) => s.nombre),
      }
    : null,
});
