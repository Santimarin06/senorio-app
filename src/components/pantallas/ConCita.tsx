// Guarda de las rutas /cita/[id]/...: carga la cita por id y maneja carga, error con
// reintento y el mensaje "No encontramos esta cita" del mockup (SRS §7).
// Solo cuando la cita existe se pinta el contenido de la pantalla.
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import EstadoPantalla from '@/components/EstadoPantalla';
import PantallaPendiente from '@/components/PantallaPendiente';
import { useCita } from '@/hooks/useCita';
import type { Cita } from '@/types/entidades';

interface Props {
  id: string;
  children: (cita: Cita) => ReactNode;
}

export default function ConCita({ id, children }: Props) {
  const { data: cita, isPending, isError, error, refetch } = useCita(id);

  // Sin id la consulta no corre (enabled: false): se muestra de una vez el mensaje.
  if (id === '') return <CitaNoEncontrada />;
  if (isPending) return <EstadoPantalla tipo="carga" mensaje="Cargando la cita…" />;
  // Solo sin datos se cambia la pantalla por el error: si falla un refresco (al volver a la
  // app sin internet) se conservan los datos y no se pierde lo escrito (RN-14).
  if (isError && cita === undefined)
    return <EstadoPantalla tipo="error" error={error} onReintentar={refetch} />;
  if (!cita) return <CitaNoEncontrada />;

  return <>{children(cita)}</>;
}

function CitaNoEncontrada() {
  return (
    <PantallaPendiente
      icono="calendar-clear-outline"
      titulo="No encontramos esta cita"
      mensaje="Verifica el código o vuelve a tu agenda."
      acciones={[{ texto: 'Ir a mis citas', onPress: () => router.navigate('/citas') }]}
    />
  );
}
