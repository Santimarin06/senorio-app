// Marcar asistencia desde una agenda del panel (RF-23), con las mismas reglas para el
// profesional (Mi agenda) y el administrador (Agenda del local): "No asistió" pide
// confirmación porque genera la multa, y nada cambia en pantalla hasta que la base confirma.
import { Alert } from 'react-native';

import { NEGOCIO } from '@/config/negocio';
import { useMarcarAsistencia } from '@/hooks/useAgenda';
import { mensajeDeAsistencia } from '@/lib/errores';
import { formatoCOP } from '@/lib/finanzas';
import type { CitaAgenda, MarcaAsistencia } from '@/types/entidades';

export const useAsistencia = () => {
  const marcar = useMarcarAsistencia();

  const guardar = (citaId: string, estado: MarcaAsistencia) =>
    // Sin actualización optimista: la pantalla cambia cuando la base confirma y se recarga.
    marcar.mutate(
      { citaId, estado },
      { onError: (e) => Alert.alert('No se guardó', mensajeDeAsistencia(e)) },
    );

  const onMarcar = (cita: CitaAgenda, estado: MarcaAsistencia) => {
    if (estado === 'asistida') return guardar(cita.id, estado);
    Alert.alert(
      '¿Marcar como no asistida?',
      `${cita.cliente.nombre} no llegó. Se genera la multa de ${formatoCOP(NEGOCIO.multa)}; si tiene anticipo aprobado, se descuenta de él.`,
      [
        { text: 'Volver', style: 'cancel' },
        { text: 'No asistió', style: 'destructive', onPress: () => guardar(cita.id, estado) },
      ],
    );
  };

  /** Props de TarjetaCitaAgenda que dependen de la marca en curso. */
  const propsTarjeta = (cita: CitaAgenda) => ({
    onMarcar: (estado: MarcaAsistencia) => onMarcar(cita, estado),
    guardando: marcar.isPending && marcar.variables.citaId === cita.id ? marcar.variables.estado : null,
    bloqueada: marcar.isPending,
  });

  return { propsTarjeta };
};
