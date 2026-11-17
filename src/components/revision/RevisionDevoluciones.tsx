// Pestaña Devoluciones de Revisión (RF-28, RN-15, RN-16, D-27): anticipos aprobados de citas
// canceladas o no asistidas que aún no se devolvieron. El monto sale de desgloseDevolucion;
// solo se muestra como devuelto cuando la base guardó devolucion_monto (RN-12).
import { Alert, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import EstadoPantalla from '@/components/EstadoPantalla';
import { DatosCita, Fila } from '@/components/revision/PartesRevision';
import { useAhora } from '@/hooks/useAgenda';
import { useDevolucionesPendientes, useRegistrarDevolucion } from '@/hooks/useRevision';
import { mensajeDeError, mensajeDeRevision } from '@/lib/errores';
import { etiquetaDia } from '@/lib/fechas';
import { formatoCOP } from '@/lib/finanzas';
import { desgloseDevolucion, plazoNoAsistida, tieneDevolucion } from '@/lib/revision';
import type { DevolucionPendiente } from '@/types/entidades';

export default function RevisionDevoluciones() {
  const consulta = useDevolucionesPendientes();
  const registrar = useRegistrarDevolucion();
  const ahora = useAhora();

  if (consulta.isPending) return <EstadoPantalla tipo="carga" mensaje="Cargando devoluciones…" />;
  if (consulta.isError) {
    return (
      <EstadoPantalla
        tipo="error"
        mensaje={mensajeDeError(consulta.error)}
        onReintentar={() => void consulta.refetch()}
      />
    );
  }
  if (consulta.data.length === 0) {
    return <EstadoPantalla tipo="vacio" icono="cash-outline" mensaje="No hay devoluciones pendientes." />;
  }

  const confirmar = (d: DevolucionPendiente, monto: number) =>
    Alert.alert(
      '¿Registrar la devolución?',
      monto > 0
        ? `Confirma que ya transferiste ${formatoCOP(monto)} a ${d.cliente}.`
        : `No queda saldo por devolver a ${d.cliente}. Se registra ${formatoCOP(0)} y el caso se cierra.`,
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Registrar',
          onPress: () =>
            registrar.mutate(
              { comprobanteId: d.comprobanteId, monto },
              { onError: (e) => Alert.alert('No se guardó', mensajeDeRevision(e)) },
            ),
        },
      ],
    );

  return (
    <View>
      {consulta.data.map((d) => {
        // La consulta solo trae estos estados; el guard mantiene el tipo estricto.
        if (!tieneDevolucion(d.cita.estado)) return null;
        const desglose = desgloseDevolucion(d.cita.estado, d.anticipoAprobado);
        const plazo = d.cita.estado === 'no_asistida' ? plazoNoAsistida(d.cita.inicio, ahora) : null;
        const guardando = registrar.isPending && registrar.variables.comprobanteId === d.comprobanteId;

        return (
          <View key={d.comprobanteId} className="mb-4 rounded-xl border border-borde p-4">
            <Text className="font-titulo text-lg text-primary">{d.cliente}</Text>
            {d.telefono ? (
              <Text className="font-texto text-sm text-secondary">Tel. {d.telefono}</Text>
            ) : null}
            <DatosCita cita={d.cita} />

            <View className="mt-2">
              <Fila etiqueta="Anticipo aprobado" valor={formatoCOP(d.anticipoAprobado)} />
              {desglose.multaDescontada > 0 ? (
                <Fila etiqueta="Multa descontada" valor={`− ${formatoCOP(desglose.multaDescontada)}`} />
              ) : null}
              <Fila etiqueta="Costo de devolución" valor={`− ${formatoCOP(desglose.costoDevolucion)}`} />
              <Fila etiqueta="Por devolver" valor={formatoCOP(desglose.devolucion)} />
            </View>

            {plazo ? (
              <Text className="mt-2 font-texto text-sm text-secondary">
                {plazo.enPlazo
                  ? `Puede reagendar con el sobrante hasta el ${etiquetaDia(plazo.hasta).largo}. Registra la devolución solo si el cliente la eligió.`
                  : 'Venció el plazo para reagendar sin que eligiera: la devolución queda pendiente.'}
              </Text>
            ) : null}

            <Boton
              className="mt-3"
              cargando={guardando}
              disabled={registrar.isPending}
              onPress={() => confirmar(d, desglose.devolucion)}
            >
              {desglose.devolucion > 0
                ? `Registrar devolución de ${formatoCOP(desglose.devolucion)}`
                : 'Registrar devolución de $0'}
            </Boton>
          </View>
        );
      })}
    </View>
  );
}
