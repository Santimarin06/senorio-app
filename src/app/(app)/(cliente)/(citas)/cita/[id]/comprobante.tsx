// Comprobante del anticipo (RF-13, RN-09), ruta /cita/[id]/comprobante. Solo muestra lo que la
// base guardó; el cuerpo vive en components/pantallas/ComprobanteCita.
import ComprobanteCita from '@/components/pantallas/ComprobanteCita';
import ConCita from '@/components/pantallas/ConCita';
import { useIdDeRuta } from '@/hooks/useIdDeRuta';

export default function ComprobanteScreen() {
  const id = useIdDeRuta('id');

  return <ConCita id={id}>{(cita) => <ComprobanteCita cita={cita} />}</ConCita>;
}
