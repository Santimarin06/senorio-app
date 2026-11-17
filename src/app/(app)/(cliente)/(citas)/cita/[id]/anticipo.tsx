// Anticipo opcional (RF-13), ruta /cita/[id]/anticipo: sin anticipo, abono o total, datos de
// pago y envío del comprobante. El cuerpo vive en components/pantallas/AnticipoCita.
import AnticipoCita from '@/components/pantallas/AnticipoCita';
import ConCita from '@/components/pantallas/ConCita';
import { useIdDeRuta } from '@/hooks/useIdDeRuta';

export default function AnticipoScreen() {
  const id = useIdDeRuta('id');

  return <ConCita id={id}>{(cita) => <AnticipoCita cita={cita} />}</ConCita>;
}
