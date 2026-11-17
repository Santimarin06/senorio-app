// Pestaña Multas de Revisión (RF-25, RN-06, RN-07, D-28): las pendientes se perdonan o se
// marcan como pagadas; las cubiertas por un anticipo ya llegan cobradas (no piden acción) y se
// ven en el historial. Nada cambia en pantalla hasta que la base confirma (RN-12).
import { Alert, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import EstadoPantalla from '@/components/EstadoPantalla';
import { DatosCita } from '@/components/revision/PartesRevision';
import { NEGOCIO } from '@/config/negocio';
import { useHistorialMultas, useMultasPendientes, useResolverMulta } from '@/hooks/useRevision';
import { mensajeDeError, mensajeDeRevision } from '@/lib/errores';
import { formatoFechaHoraBogota } from '@/lib/fechas';
import { formatoCOP } from '@/lib/finanzas';
import { ETIQUETA_MULTA } from '@/models/revision.mapper';
import type { Resolucion } from '@/services/revision.api';
import type { MotivoMulta, MultaRevision } from '@/types/entidades';

const MOTIVO: Record<MotivoMulta, string> = {
  no_asistio: 'No asistió',
  cancelo_tarde: `Canceló con menos de ${NEGOCIO.horasMinimasCancelarSinMulta} h`,
};

export default function RevisionMultas() {
  const pendientes = useMultasPendientes();
  const resolver = useResolverMulta();

  const confirmar = (m: MultaRevision, estado: Resolucion) => {
    const perdonar = estado === 'perdonada';
    Alert.alert(
      perdonar ? '¿Perdonar la multa?' : '¿Marcar la multa como pagada?',
      `${m.cliente}: ${formatoCOP(m.monto)}. ${
        perdonar ? 'La multa queda perdonada' : 'Confirma que recibiste el pago'
      }; si no tiene otras multas pendientes, vuelve a poder reservar y pagar anticipos.`,
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: perdonar ? 'Perdonar' : 'Marcar como pagada',
          onPress: () =>
            resolver.mutate(
              { id: m.id, estado },
              { onError: (e) => Alert.alert('No se guardó', mensajeDeRevision(e)) },
            ),
        },
      ],
    );
  };

  return (
    <View>
      {pendientes.isPending ? (
        <EstadoPantalla tipo="carga" mensaje="Cargando multas…" />
      ) : pendientes.isError ? (
        <EstadoPantalla
          tipo="error"
          mensaje={mensajeDeError(pendientes.error)}
          onReintentar={() => void pendientes.refetch()}
        />
      ) : pendientes.data.length === 0 ? (
        <EstadoPantalla tipo="vacio" icono="checkmark-circle-outline" mensaje="No hay multas pendientes." />
      ) : (
        pendientes.data.map((m) => {
          const guardando = resolver.isPending && resolver.variables.id === m.id ? resolver.variables.estado : null;
          return (
            <View key={m.id} className="mb-4 rounded-xl border border-borde p-4">
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 font-titulo text-lg text-primary">{m.cliente}</Text>
                <Text className="font-titulo text-xl text-primary">{formatoCOP(m.monto)}</Text>
              </View>
              <DatosCita cita={m.cita} />
              <Text className="mt-2 font-texto text-base text-primary">
                {MOTIVO[m.motivo]}; sin anticipo aprobado.
              </Text>
              <Text className="font-texto text-sm text-secondary">
                Mientras esté pendiente, no puede reservar ni pagar anticipos. Perdonarla o marcarla
                como pagada lo desbloquea.
              </Text>
              <View className="mt-3 flex-row">
                <Boton
                  variante="borde"
                  className="mr-2 flex-1"
                  cargando={guardando === 'perdonada'}
                  disabled={resolver.isPending}
                  onPress={() => confirmar(m, 'perdonada')}
                >
                  Perdonar
                </Boton>
                <Boton
                  className="flex-1"
                  cargando={guardando === 'pagada'}
                  disabled={resolver.isPending}
                  onPress={() => confirmar(m, 'pagada')}
                >
                  Marcar como pagada
                </Boton>
              </View>
            </View>
          );
        })
      )}

      <HistorialMultas />
    </View>
  );
}

/** Últimas multas resueltas. Las cobradas del anticipo no tienen acción manual (D-28). */
function HistorialMultas() {
  const historial = useHistorialMultas();

  return (
    <View className="mt-4 border-t border-borde pt-4">
      <Text className="font-titulo text-lg text-primary">Historial</Text>
      <Text className="mb-3 font-texto text-sm text-secondary">
        Si la cita tenía un anticipo aprobado, la multa se descuenta sola de ese anticipo: queda
        "Cobrada del anticipo", no bloquea al cliente y no necesita acción. La devolución del
        sobrante se registra en Devoluciones.
      </Text>
      {historial.isPending ? (
        <Text className="font-texto text-sm text-secondary">Cargando el historial…</Text>
      ) : historial.isError ? (
        <Text className="font-texto text-sm text-secondary">
          {mensajeDeError(historial.error)}{' '}
          <Text className="underline" onPress={() => void historial.refetch()}>
            Reintentar
          </Text>
        </Text>
      ) : historial.data.length === 0 ? (
        <Text className="font-texto text-sm text-secondary">Aún no hay multas resueltas.</Text>
      ) : (
        historial.data.map((m) => (
          <View key={m.id} className="mb-2 rounded-xl border border-borde p-3">
            <View className="flex-row justify-between">
              <Text className="flex-1 font-texto text-base text-primary">{m.cliente}</Text>
              <Text className="font-texto text-base text-primary">{formatoCOP(m.monto)}</Text>
            </View>
            <DatosCita cita={m.cita} />
            <Text className="font-texto text-sm text-primary">
              {MOTIVO[m.motivo]} · {ETIQUETA_MULTA[m.estado]}
              {m.resueltaEn ? ` · ${formatoFechaHoraBogota(m.resueltaEn)}` : ''}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}
