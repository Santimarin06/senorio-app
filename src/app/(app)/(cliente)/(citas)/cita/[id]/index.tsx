// Detalle de cita por id (RF-08), ruta dinámica /cita/[id].
import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import ConCita from '@/components/pantallas/ConCita';
import { useIdDeRuta } from '@/hooks/useIdDeRuta';
import { formatoCOP } from '@/lib/dinero';
import { formatoFechaHoraBogota } from '@/lib/fechas';
import { ETIQUETA_ESTADO } from '@/models/cita.mapper';

export default function DetalleCitaScreen() {
  const id = useIdDeRuta('id');

  return (
    <ConCita id={id}>
      {(cita) => (
        <ScrollView className="flex-1 bg-fondo" contentContainerStyle={{ padding: 24 }}>
          <Text className="font-titulo text-xl text-primary">{cita.profesional}</Text>
          <Text className="font-texto text-base text-secondary">
            {formatoFechaHoraBogota(cita.inicio)}
          </Text>

          <View className="my-6 rounded-xl border border-borde p-4">
            <Text className="font-texto text-base text-primary">
              Estado: {ETIQUETA_ESTADO[cita.estado]}
            </Text>
            <Text className="font-texto text-base text-primary">Valor: {formatoCOP(cita.total)}</Text>
          </View>

          <Boton
            className="mb-3"
            onPress={() => router.push({ pathname: '/cita/[id]/anticipo', params: { id } })}
          >
            Anticipo
          </Boton>
          <Boton
            variante="borde"
            className="mb-3"
            onPress={() => router.push({ pathname: '/cita/[id]/reagendar', params: { id } })}
          >
            Reagendar
          </Boton>
          <Boton
            variante="borde"
            onPress={() => router.push({ pathname: '/cita/[id]/cancelar', params: { id } })}
          >
            Cancelar cita
          </Boton>
        </ScrollView>
      )}
    </ConCita>
  );
}
