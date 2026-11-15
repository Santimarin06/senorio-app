// Reagendar cita (RF-14).
import { router } from 'expo-router';

import PantallaPendiente from '@/components/PantallaPendiente';
import ConCita from '@/components/pantallas/ConCita';
import { useIdDeRuta } from '@/hooks/useIdDeRuta';

export default function ReagendarCitaScreen() {
  const id = useIdDeRuta('id');

  return (
    <ConCita id={id}>
      {() => (
        <PantallaPendiente
          mensaje="Reagendar (RF-14) llega en la siguiente entrega. Tu cita sigue igual."
          acciones={[{
            texto: 'Volver a la cita',
            onPress: () => router.navigate({ pathname: '/cita/[id]', params: { id } }),
          }]}
        />
      )}
    </ConCita>
  );
}
