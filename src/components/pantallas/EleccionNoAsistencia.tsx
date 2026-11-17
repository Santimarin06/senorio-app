// Cita no asistida en el detalle (RN-16, D-05, D-26, D-27). Con anticipo, el cliente elige
// qué pasa con el sobrante (anticipo − multa): devolución (sobrante − $2.000) o reagendar con
// él dentro de 2 días. Si no elige a tiempo, queda como devolución pendiente que el local
// registra en Revisión. Los montos salen de src/lib/finanzas.ts y el estado de
// src/lib/reagendar.ts; la elección la guarda la base con elegir_devolucion.
import { router } from 'expo-router';
import { Alert, Text, View } from 'react-native';

import AvisoEscritura from '@/components/AvisoEscritura';
import Boton from '@/components/Boton';
import { NEGOCIO } from '@/config/negocio';
import { useElegirDevolucion, useMultaPendiente } from '@/hooks/useCita';
import { mensajeDeEleccion } from '@/lib/errores';
import { etiquetaDia } from '@/lib/fechas';
import { calcularOpcionesNoAsistencia, formatoCOP } from '@/lib/finanzas';
import { estadoEleccionNoAsistencia } from '@/lib/reagendar';
import { plazoNoAsistida } from '@/lib/revision';
import type { Cita } from '@/types/entidades';

export default function EleccionNoAsistencia({ cita }: { cita: Cita }) {
  const elegir = useElegirDevolucion();
  const multa = useMultaPendiente();
  const ahora = Date.now();
  const plazo = plazoNoAsistida(cita.inicio, ahora);
  const irAReagendar = () => router.push({ pathname: '/cita/[id]/reagendar', params: { id: cita.id } });

  // Sin anticipo: la multa quedó pendiente; hasta resolverla no se reagenda (D-26).
  if (cita.anticipoAprobado <= 0) {
    if (!plazo.enPlazo) return null;
    const conMulta = (multa.data ?? 0) > 0;
    return (
      <View className="mb-6 rounded-xl border border-borde p-4">
        <Text className="font-titulo text-base text-primary">No asististe a esta cita</Text>
        <Text className="mb-3 font-texto text-sm text-secondary">
          {conMulta
            ? `Para reagendarla primero paga la multa de ${formatoCOP(NEGOCIO.multa)} o habla con el local. Tienes hasta el ${etiquetaDia(plazo.hasta).largo}.`
            : `Puedes reagendarla hasta el ${etiquetaDia(plazo.hasta).largo} pagando un anticipo de ${formatoCOP(NEGOCIO.abonoMinimo)}.`}
        </Text>
        {conMulta ? (
          <Boton variante="borde" onPress={() => router.navigate('/cuenta')}>
            Ver mi multa
          </Boton>
        ) : multa.data === 0 ? (
          <Boton variante="borde" onPress={irAReagendar}>
            Reagendar
          </Boton>
        ) : null}
      </View>
    );
  }

  const op = calcularOpcionesNoAsistencia(cita.anticipoAprobado);
  const estado = estadoEleccionNoAsistencia(cita, ahora);

  const pedirDevolucion = () =>
    Alert.alert(
      'Pedir devolución',
      `Recibes ${formatoCOP(op.devolucion)} y esta cita ya no se podrá reagendar.`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Sí, devolución', onPress: () => elegir.mutate(cita.id) },
      ],
    );

  return (
    <View className="mb-6 rounded-xl border border-borde p-4">
      <Text className="font-titulo text-base text-primary">No asististe a esta cita</Text>
      <Text className="mb-3 font-texto text-sm text-secondary">
        De tu anticipo de {formatoCOP(cita.anticipoAprobado)} se descontó la multa de{' '}
        {formatoCOP(op.multaCubierta)}. Te quedan {formatoCOP(op.sobrante)}.
      </Text>

      {estado === 'devolucion_registrada' ? (
        <Text className="font-texto text-base text-primary">
          El local registró la devolución de tu anticipo.
        </Text>
      ) : estado === 'devolucion_elegida' ? (
        <Text className="font-texto text-base text-primary">
          Elegiste la devolución: el local te transferirá {formatoCOP(op.devolucion)}.
        </Text>
      ) : estado === 'devolucion_pendiente' ? (
        <Text className="font-texto text-base text-primary">
          {op.devolucion > 0
            ? `Venció el plazo para elegir: el local te devolverá ${formatoCOP(op.devolucion)}.`
            : 'Venció el plazo para reagendar. No quedó saldo por devolver.'}
        </Text>
      ) : (
        <>
          <Text className="mb-3 font-texto text-sm text-primary">
            Elige antes de terminar el {etiquetaDia(plazo.hasta).largo}:
          </Text>

          <Text className="font-texto text-base text-primary">Reagendar con mi anticipo</Text>
          <Text className="mb-2 font-texto text-sm text-secondary">
            {op.trasladado > 0 ? `Pasan ${formatoCOP(op.trasladado)} a la nueva cita.` : 'No pasa saldo.'}
            {op.diferencia > 0
              ? ` Pagas ${formatoCOP(op.diferencia)} más para completar ${formatoCOP(NEGOCIO.abonoMinimo)}.`
              : ''}
          </Text>
          <Boton className="mb-4" disabled={elegir.isPending} onPress={irAReagendar}>
            Reagendar con mi anticipo
          </Boton>

          {op.sobrante > 0 ? (
            <>
              <Text className="font-texto text-base text-primary">Devolución</Text>
              <Text className="mb-2 font-texto text-sm text-secondary">
                Recibes {formatoCOP(op.devolucion)} ({formatoCOP(op.sobrante)} menos{' '}
                {formatoCOP(op.costoDevolucion)} por la transferencia).
              </Text>
              {elegir.isError ? (
                <AvisoEscritura error={elegir.error} mensaje={mensajeDeEleccion(elegir.error)} className="mb-2" />
              ) : null}
              <Boton variante="borde" cargando={elegir.isPending} onPress={pedirDevolucion}>
                {elegir.isError ? 'Reintentar devolución' : 'Devolución'}
              </Boton>
            </>
          ) : null}
        </>
      )}
    </View>
  );
}
