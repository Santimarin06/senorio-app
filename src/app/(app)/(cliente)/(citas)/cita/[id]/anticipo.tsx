// Anticipo opcional (RF-13): sin anticipo, abono o total, con los datos de pago.
import { router } from 'expo-router';

import PantallaPendiente from '@/components/PantallaPendiente';
import ConCita from '@/components/pantallas/ConCita';
import { useIdDeRuta } from '@/hooks/useIdDeRuta';

export default function AnticipoScreen() {
  const id = useIdDeRuta('id');

  return (
    <ConCita id={id}>
      {() => (
        <PantallaPendiente
          icono="wallet-outline"
          mensaje="Elegir el anticipo y ver los datos de pago (RF-13) llega en la siguiente entrega."
          acciones={[
            {
              texto: 'Subir comprobante',
              onPress: () => router.push({ pathname: '/cita/[id]/comprobante', params: { id } }),
            },
            {
            texto: 'Volver a la cita',
            onPress: () => router.navigate({ pathname: '/cita/[id]', params: { id } }),
          },
          ]}
        />
      )}
    </ConCita>
  );
}
