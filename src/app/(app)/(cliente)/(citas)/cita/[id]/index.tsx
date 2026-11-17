// Detalle de cita por id (RF-08), ruta dinámica /cita/[id]. Total y saldo con las funciones de
// src/lib/finanzas.ts: el anticipo solo cuenta cuando el local lo aprueba (RN-09).
import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import ConCita from '@/components/pantallas/ConCita';
import { useIdDeRuta } from '@/hooks/useIdDeRuta';
import { estadoVisible } from '@/lib/agenda';
import { puedeCancelar } from '@/lib/cancelacion';
import { formatoFechaHoraBogota } from '@/lib/fechas';
import { calcularSaldo, formatoCOP } from '@/lib/finanzas';
import { ETIQUETA_ANTICIPO, ETIQUETA_ESTADO } from '@/models/cita.mapper';

export default function DetalleCitaScreen() {
  const id = useIdDeRuta('id');

  return (
    <ConCita id={id}>
      {(cita) => {
        const vigente = cita.estado === 'confirmada' && Date.parse(cita.inicio) > Date.now();
        const saldo = calcularSaldo(cita.total, cita.anticipoAprobado);
        const conComprobante = cita.anticipo.estado !== 'sin_anticipo';

        return (
          <ScrollView className="flex-1 bg-fondo" contentContainerStyle={{ padding: 24 }}>
            <Text className="font-titulo text-xl text-primary">{cita.profesional}</Text>
            <Text className="font-texto text-base text-secondary">
              {formatoFechaHoraBogota(cita.inicio)}
            </Text>
            <Text className="mt-1 font-texto text-base text-primary">
              Estado: {ETIQUETA_ESTADO[estadoVisible(cita, Date.now())]}
            </Text>
            <Text className="font-texto text-base text-primary">
              Anticipo: {ETIQUETA_ANTICIPO[cita.anticipo.estado]}
            </Text>

            <View className="my-6 rounded-xl border border-borde p-4">
              {cita.servicios.map((s) => (
                <View key={s.nombre} className="flex-row justify-between">
                  <Text className="font-texto text-base text-primary">{s.nombre}</Text>
                  <Text className="font-texto text-base text-primary">{formatoCOP(s.precio)}</Text>
                </View>
              ))}
              <View className="mt-3 flex-row justify-between border-t border-borde pt-3">
                <Text className="font-texto text-base text-primary">Total</Text>
                <Text className="font-titulo text-base text-primary">{formatoCOP(cita.total)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="font-texto text-base text-secondary">Anticipo aprobado</Text>
                <Text className="font-texto text-base text-secondary">
                  {formatoCOP(cita.anticipoAprobado)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="font-texto text-base text-primary">Saldo por pagar</Text>
                <Text className="font-titulo text-base text-primary">{formatoCOP(saldo)}</Text>
              </View>
            </View>

            {vigente ? (
              <>
                {/* RF-13: con un comprobante enviado se va a su estado; si no, a pagar el anticipo. */}
                <Boton
                  className="mb-3"
                  onPress={() =>
                    router.push({
                      pathname: conComprobante ? '/cita/[id]/comprobante' : '/cita/[id]/anticipo',
                      params: { id },
                    })
                  }
                >
                  {conComprobante ? 'Ver comprobante' : 'Pagar anticipo'}
                </Boton>
                <Boton
                  variante="borde"
                  className="mb-3"
                  onPress={() => router.push({ pathname: '/cita/[id]/reagendar', params: { id } })}
                >
                  Reagendar
                </Boton>
              </>
            ) : null}
            {/* RF-09: mismo criterio que la función cancelar_cita de la base. */}
            {puedeCancelar(cita, Date.now()) ? (
              <Boton
                variante="borde"
                onPress={() => router.push({ pathname: '/cita/[id]/cancelar', params: { id } })}
              >
                Cancelar cita
              </Boton>
            ) : null}
          </ScrollView>
        );
      }}
    </ConCita>
  );
}
