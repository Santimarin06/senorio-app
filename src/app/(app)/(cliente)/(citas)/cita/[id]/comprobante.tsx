// Comprobante del anticipo (RF-13). No muestra "Recibido" hasta que el archivo se guarde de verdad.
import { router } from 'expo-router';

import PantallaPendiente from '@/components/PantallaPendiente';
import ConCita from '@/components/pantallas/ConCita';
import { useIdDeRuta } from '@/hooks/useIdDeRuta';

export default function ComprobanteScreen() {
  const id = useIdDeRuta('id');

  return (
    <ConCita id={id}>
      {() => (
        <PantallaPendiente
          icono="image-outline"
          mensaje="Subir el comprobante con la cámara o la galería (RF-13) llega en la siguiente entrega. Todavía no se ha enviado nada."
          acciones={[{
            texto: 'Volver al anticipo',
            onPress: () => router.navigate({ pathname: '/cita/[id]/anticipo', params: { id } }),
          }]}
        />
      )}
    </ConCita>
  );
}
