// Cotización (RF-10): lee el carrito de Zustand. Agregar productos, el contador y el envío
// por WhatsApp llegan con RF-10.
import { router } from 'expo-router';

import PantallaPendiente from '@/components/PantallaPendiente';
import { useCarritoStore } from '@/store/useCarritoStore';

export default function CotizacionScreen() {
  const cantidadItems = useCarritoStore((s) => s.items.length);

  return (
    <PantallaPendiente
      icono="receipt-outline"
      mensaje={
        cantidadItems === 0
          ? 'Tu cotización está vacía. Elegir productos y enviarla por WhatsApp (RF-10) llega en la siguiente entrega.'
          : `Tienes ${cantidadItems} producto(s) en tu cotización. El envío por WhatsApp (RF-10) llega en la siguiente entrega.`
      }
      acciones={[{ texto: 'Ver productos', onPress: () => router.navigate('/productos') }]}
    />
  );
}
