// Resumen y política (RF-05, RF-06). Muestra el borrador de la reserva. Confirmar llama a
// reservar_cita en Supabase, que necesita una sesión real (RF-01): mientras tanto no se
// muestra ningún botón que finja guardar la cita (RN-14).
import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import PantallaPendiente from '@/components/PantallaPendiente';
import { formatoCOP } from '@/lib/dinero';
import { formatoFechaHoraBogota } from '@/lib/fechas';
import { calcularTotalCita } from '@/lib/reserva';
import { useReservaStore } from '@/store/useReservaStore';

export default function ResumenScreen() {
  const profesional = useReservaStore((s) => s.profesional);
  const servicios = useReservaStore((s) => s.servicios);
  const inicio = useReservaStore((s) => s.inicio);

  if (!profesional || servicios.length === 0 || !inicio) {
    return (
      <PantallaPendiente
        icono="time-outline"
        mensaje="Aún no has elegido un horario para tu cita."
        acciones={[{ texto: 'Elegir horario', onPress: () => router.navigate('/reservar/horario') }]}
      />
    );
  }

  const total = calcularTotalCita(servicios);

  return (
    <ScrollView className="flex-1 bg-fondo" contentContainerStyle={{ padding: 24 }}>
      <View className="mb-6 rounded-xl border border-borde p-4">
        <Text className="font-titulo text-lg text-primary">{profesional.nombre}</Text>
        <Text className="mb-3 font-texto text-base text-secondary">{formatoFechaHoraBogota(inicio)}</Text>
        {servicios.map((s) => (
          <View key={s.id} className="flex-row justify-between">
            <Text className="font-texto text-base text-primary">{s.nombre}</Text>
            <Text className="font-texto text-base text-primary">{formatoCOP(s.precio)}</Text>
          </View>
        ))}
        <View className="mt-3 flex-row justify-between border-t border-borde pt-3">
          <Text className="font-texto text-base text-primary">Total · {total.duracionMin} min</Text>
          <Text className="font-titulo text-base text-primary">{formatoCOP(total.precio)}</Text>
        </View>
      </View>

      <Text className="mb-4 font-texto text-sm text-secondary">
        Confirmar la cita con la política de reservas (RF-05, RF-06) llega junto con el inicio de sesión
        real (RF-01). Todavía no se ha registrado nada.
      </Text>

      <Boton variante="borde" className="mb-3" onPress={() => router.navigate('/politica')}>
        Leer la política de reservas
      </Boton>
      <Boton variante="borde" onPress={() => router.back()}>
        Cambiar horario
      </Boton>
    </ScrollView>
  );
}
