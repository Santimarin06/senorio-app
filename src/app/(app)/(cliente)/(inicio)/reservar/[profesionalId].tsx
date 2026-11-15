import DetalleProfesional from '@/components/pantallas/DetalleProfesional';
import { useIdDeRuta } from '@/hooks/useIdDeRuta';

export default function ServiciosProfesionalScreen() {
  const profesionalId = useIdDeRuta('profesionalId');
  return <DetalleProfesional id={profesionalId} />;
}
