import { useLocalSearchParams } from 'expo-router';

import DetalleProfesional from '@/components/pantallas/DetalleProfesional';

export default function ServiciosProfesionalScreen() {
  const { profesionalId } = useLocalSearchParams<{ profesionalId: string }>();
  return <DetalleProfesional id={profesionalId ?? ''} />;
}
