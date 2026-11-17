// Reagendar cita (RF-14), ruta /cita/[id]/reagendar. Qué anticipo pasa lo calcula
// src/lib/reagendar.ts y el cambio lo hace la base con reagendar_cita (D-30, D-45).
import ConCita from '@/components/pantallas/ConCita';
import ReagendarCita from '@/components/pantallas/ReagendarCita';
import { useIdDeRuta } from '@/hooks/useIdDeRuta';

export default function ReagendarCitaScreen() {
  const id = useIdDeRuta('id');

  return <ConCita id={id}>{(cita) => <ReagendarCita cita={cita} />}</ConCita>;
}
