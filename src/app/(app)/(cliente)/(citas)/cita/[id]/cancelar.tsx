// Cancelar cita (RF-09), ruta /cita/[id]/cancelar. La consecuencia (multa o devolución) se
// calcula con src/lib/finanzas.ts y la cancelación la hace la base con cancelar_cita (D-30).
import CancelarCita from '@/components/pantallas/CancelarCita';
import ConCita from '@/components/pantallas/ConCita';
import { useIdDeRuta } from '@/hooks/useIdDeRuta';

export default function CancelarCitaScreen() {
  const id = useIdDeRuta('id');

  return <ConCita id={id}>{(cita) => <CancelarCita cita={cita} />}</ConCita>;
}
