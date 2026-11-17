// Una cita de la agenda del panel (RF-21, RF-23): hora, cliente, servicios, estado, anticipo
// y, cuando corresponde, los botones de asistencia. La usa Mi agenda y le sirve a la agenda
// del administrador (RF-22) con mostrarProfesional.
import { Text, View } from 'react-native';

import Boton from '@/components/Boton';
import {
  estadoVisible,
  finTolerancia,
  horaBogota,
  puedeMarcarAsistida,
  puedeMarcarNoAsistida,
} from '@/lib/agenda';
import { codigoCita } from '@/lib/codigoCita';
import { formatoCOP } from '@/lib/finanzas';
import { ETIQUETA_ESTADO } from '@/models/cita.mapper';
import type { CitaAgenda, MarcaAsistencia } from '@/types/entidades';

interface Props {
  cita: CitaAgenda;
  ahoraMs: number;
  onMarcar: (estado: MarcaAsistencia) => void;
  /** Botón de esta cita que se está guardando, para mostrarlo cargando. */
  guardando: MarcaAsistencia | null;
  /** Mientras se guarda cualquier marca, no se puede pulsar otra. */
  bloqueada: boolean;
  mostrarProfesional?: boolean;
}

export default function TarjetaCitaAgenda({
  cita,
  ahoraMs,
  onMarcar,
  guardando,
  bloqueada,
  mostrarProfesional = false,
}: Props) {
  const estado = estadoVisible(cita, ahoraMs);
  const duracion = cita.servicios.reduce((suma, s) => suma + s.duracionMin, 0);
  const asistida = puedeMarcarAsistida(cita, ahoraMs);
  const noAsistida = puedeMarcarNoAsistida(cita, ahoraMs);
  const finTol = new Date(finTolerancia(cita.inicio)).toISOString();

  return (
    <View
      className={`mb-3 rounded-xl border p-4 ${estado === 'por_marcar' ? 'border-primary' : 'border-borde'}`}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="font-titulo text-lg text-primary">{horaBogota(cita.inicio)}</Text>
          <Text className="font-texto text-base text-primary">
            {cita.cliente.nombre} · {codigoCita(cita.id)}
          </Text>
          {cita.cliente.telefono ? (
            <Text className="font-texto text-sm text-secondary">{cita.cliente.telefono}</Text>
          ) : null}
        </View>
        <Text className="font-texto text-sm text-primary">{ETIQUETA_ESTADO[estado]}</Text>
      </View>

      <Text className="mt-2 font-texto text-base text-secondary">
        {cita.servicios.map((s) => s.nombre).join(', ') || 'Sin servicios'} · {duracion} min · Hasta{' '}
        {horaBogota(cita.fin)}
      </Text>
      {mostrarProfesional ? (
        <Text className="font-texto text-base text-secondary">Con {cita.profesional}</Text>
      ) : null}
      <Text className="font-texto text-sm text-secondary">
        Total {formatoCOP(cita.total)} ·{' '}
        {cita.anticipoAprobado > 0
          ? `Anticipo aprobado ${formatoCOP(cita.anticipoAprobado)}`
          : 'Sin anticipo aprobado'}
      </Text>

      {estado === 'por_marcar' ? (
        <Text className="mt-2 font-texto text-sm text-primary">
          Tolerancia vencida · {horaBogota(finTol)}
        </Text>
      ) : null}

      {asistida ? (
        <View className="mt-3 flex-row gap-3">
          <Boton
            className="flex-1"
            onPress={() => onMarcar('asistida')}
            cargando={guardando === 'asistida'}
            disabled={bloqueada}
          >
            Asistió
          </Boton>
          {noAsistida ? (
            <Boton
              className="flex-1"
              variante="borde"
              onPress={() => onMarcar('no_asistida')}
              cargando={guardando === 'no_asistida'}
              disabled={bloqueada}
            >
              No asistió
            </Boton>
          ) : null}
        </View>
      ) : null}
      {asistida && !noAsistida ? (
        // D-08: la no asistencia solo se marca después de los 10 minutos de tolerancia.
        <Text className="mt-2 font-texto text-sm text-secondary">
          &quot;No asistió&quot; se habilita a las {horaBogota(finTol)}.
        </Text>
      ) : null}
    </View>
  );
}
