// Cita registrada (RF-07). Llega con ?citaId= y la confirma leyéndola de la base:
// nunca se muestra "registrada" una cita que no se guardó (RN-12, RN-14).
import { router } from 'expo-router';

import PantallaPendiente from '@/components/PantallaPendiente';
import ConCita from '@/components/pantallas/ConCita';
import { useIdDeRuta } from '@/hooks/useIdDeRuta';
import { formatoFechaHoraBogota } from '@/lib/fechas';

export default function ConfirmacionScreen() {
  const citaId = useIdDeRuta('citaId');

  if (citaId === '') {
    return (
      <PantallaPendiente
        icono="calendar-clear-outline"
        mensaje="No hay una cita recién registrada."
        acciones={[{ texto: 'Ir al inicio', onPress: () => router.navigate('/inicio') }]}
      />
    );
  }

  return (
    <ConCita id={citaId}>
      {(cita) => (
        <PantallaPendiente
          icono="checkmark-circle-outline"
          mensaje={`Nos vemos en la silla: ${formatoFechaHoraBogota(cita.inicio)} con ${cita.profesional}.`}
          acciones={[
            {
              texto: 'Ver mi cita',
              onPress: () => router.navigate({ pathname: '/cita/[id]', params: { id: cita.id } }),
            },
            { texto: 'Ir al inicio', onPress: () => router.navigate('/inicio') },
          ]}
        />
      )}
    </ConCita>
  );
}
