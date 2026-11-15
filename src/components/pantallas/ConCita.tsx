// Guarda de las rutas /cita/[id]/...: carga la cita por id y maneja carga, error con
// reintento y el mensaje "No encontramos esta cita" del mockup (SRS §7).
// Solo cuando la cita existe se pinta el contenido de la pantalla.
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import EstadoPantalla from '@/components/EstadoPantalla';
import PantallaPendiente from '@/components/PantallaPendiente';
import { useCita } from '@/hooks/useCita';
import { mensajeDeError } from '@/lib/errores';
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
  if (isError)
    return <EstadoPantalla tipo="error" mensaje={mensajeDeError(error)} onReintentar={refetch} />;
  if (!cita) return <CitaNoEncontrada />;

  return <>{children(cita)}</>;
}

function CitaNoEncontrada() {
  return (
    <PantallaPendiente
      icono="calendar-clear-outline"
      mensaje="No encontramos esta cita. Puede que el enlace esté incompleto o que la cita no sea tuya."
      acciones={[{ texto: 'Ver mis citas', onPress: () => router.navigate('/citas') }]}
    />
  );
}
