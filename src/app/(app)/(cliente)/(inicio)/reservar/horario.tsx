// Horario semanal (RF-04). Necesita un profesional y al menos un servicio principal en el borrador.
import { router } from 'expo-router';

import PantallaPendiente from '@/components/PantallaPendiente';
import { faltaServicioPrincipal } from '@/lib/reserva';
import { useReservaStore } from '@/store/useReservaStore';

export default function HorarioScreen() {
  const profesional = useReservaStore((s) => s.profesional);
  const servicios = useReservaStore((s) => s.servicios);

  if (!profesional || servicios.length === 0 || faltaServicioPrincipal(servicios)) {
    return (
      <PantallaPendiente
        icono="cut-outline"
        mensaje="Primero elige un profesional y al menos un servicio principal."
        acciones={[{ texto: 'Elegir profesional', onPress: () => router.navigate('/reservar') }]}
      />
    );
  }

  return (
    <PantallaPendiente
      icono="calendar-outline"
      mensaje={`El horario semanal de ${profesional.nombre} (RF-04) llega en la siguiente entrega. Tu selección de servicios queda guardada.`}
      acciones={[
        {
          texto: 'Cambiar servicios',
          onPress: () =>
            router.navigate({
              pathname: '/reservar/[profesionalId]',
              params: { profesionalId: profesional.id },
            }),
        },
      ]}
    />
  );
}
