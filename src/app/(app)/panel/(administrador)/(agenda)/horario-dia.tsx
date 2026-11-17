import { useLocalSearchParams } from 'expo-router';

import HorarioDia from '@/components/pantallas/HorarioDia';

// RF-24, D-09: habilitar, cambiar el horario o cerrar una fecha (?fecha=YYYY-MM-DD, opcional).
export default function HorarioDiaScreen() {
  const { fecha } = useLocalSearchParams<{ fecha?: string }>();
  return <HorarioDia fechaInicial={typeof fecha === 'string' ? fecha : undefined} />;
}
