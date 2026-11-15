// Resumen y política (RF-05, RF-06). Sin franja elegida no hay nada que confirmar.
import { router } from 'expo-router';

import PantallaPendiente from '@/components/PantallaPendiente';
import { useReservaStore } from '@/store/useReservaStore';

export default function ResumenScreen() {
  const inicio = useReservaStore((s) => s.inicio);

  if (!inicio) {
    return (
      <PantallaPendiente
        icono="time-outline"
        mensaje="Aún no has elegido un horario para tu cita."
        acciones={[{ texto: 'Elegir horario', onPress: () => router.navigate('/reservar/horario') }]}
      />
    );
  }

  return (
    <PantallaPendiente
      icono="document-text-outline"
      mensaje="El resumen con la política de reservas y la confirmación (RF-05, RF-06) llega en la siguiente entrega."
      acciones={[{ texto: 'Leer la política', onPress: () => router.navigate('/politica') }]}
    />
  );
}
