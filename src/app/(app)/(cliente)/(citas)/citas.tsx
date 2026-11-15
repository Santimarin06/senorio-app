import { router } from 'expo-router';

import PantallaPendiente from '@/components/PantallaPendiente';

// La lista de citas (RF-08) necesita la tabla de citas y la sesión real (RF-01, RF-05).
// Mientras tanto no se muestran citas de ejemplo: no se presenta como guardado algo que no existe.
export default function CitasScreen() {
  return (
    <PantallaPendiente
      icono="calendar-outline"
      mensaje="Aún no tienes citas registradas. Tus citas próximas y pasadas aparecerán aquí."
      acciones={[{ texto: 'Reservar cita', onPress: () => router.navigate('/reservar') }]}
    />
  );
}
