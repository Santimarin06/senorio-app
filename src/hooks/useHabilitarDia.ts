// "Habilitar" un domingo o festivo con el horario por defecto, 10:00 a 16:00 (RF-24, RN-10, D-09).
// Lo usan la tarjeta de la agenda del local y la lista de días laborables. Solo se muestra como
// habilitado cuando la base devuelve la fila (RN-12).
import { Alert } from 'react-native';

import { useGuardarDiaEspecial } from '@/hooks/useDiasTrabajo';
import { CONFIG } from '@/lib/disponibilidad';
import { mensajeDeDiasTrabajo } from '@/lib/errores';

export const useHabilitarDia = () => {
  const guardar = useGuardarDiaEspecial();

  const habilitar = (fecha: string) =>
    guardar.mutate(
      {
        fecha,
        abierto: true,
        abreMin: CONFIG.HABILITADO.abreMin,
        cierraMin: CONFIG.HABILITADO.cierraMin,
        nota: null,
      },
      { onError: (e) => Alert.alert('No se habilitó', mensajeDeDiasTrabajo(e)) },
    );

  /** Fecha que se está habilitando, o null. */
  const habilitando = guardar.isPending ? guardar.variables.fecha : null;

  return { habilitar, habilitando };
};
