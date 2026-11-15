// Cancelar cita (RF-09). La consecuencia (multa o devolución) se calcula con multas-y-devoluciones.
import { router } from 'expo-router';

import PantallaPendiente from '@/components/PantallaPendiente';
import ConCita from '@/components/pantallas/ConCita';
import { useIdDeRuta } from '@/hooks/useIdDeRuta';

export default function CancelarCitaScreen() {
  const id = useIdDeRuta('id');

  return (
    <ConCita id={id}>
      {() => (
        <PantallaPendiente
          mensaje="La cancelación con su multa o devolución (RF-09) llega en la siguiente entrega. Tu cita sigue igual."
          acciones={[{
            texto: 'Volver a la cita',
            onPress: () => router.navigate({ pathname: '/cita/[id]', params: { id } }),
          }]}
        />
      )}
    </ConCita>
  );
}
