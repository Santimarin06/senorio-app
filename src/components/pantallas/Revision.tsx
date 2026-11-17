// Revisión del administrador (RF-25, RF-28, mockup "Revisar y resolver"): pestañas
// Comprobantes, Multas y Devoluciones, cada una con su contador de pendientes.
import { useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';

import Chip from '@/components/Chip';
import FormularioConTeclado from '@/components/FormularioConTeclado';
import RevisionComprobantes from '@/components/revision/RevisionComprobantes';
import RevisionDevoluciones from '@/components/revision/RevisionDevoluciones';
import RevisionMultas from '@/components/revision/RevisionMultas';
import {
  useComprobantesPendientes,
  useDevolucionesPendientes,
  useHistorialMultas,
  useMultasPendientes,
} from '@/hooks/useRevision';

type Pestana = 'comprobantes' | 'multas' | 'devoluciones';

/** "Comprobantes · 2"; sin número mientras carga o si falló (la pestaña muestra el error). */
const conContador = (texto: string, cantidad: number | undefined) =>
  cantidad === undefined ? texto : `${texto} · ${cantidad}`;

export default function Revision() {
  const [pestana, setPestana] = useState<Pestana>('comprobantes');
  // Las mismas consultas que usan las pestañas: TanStack Query no las repite.
  const comprobantes = useComprobantesPendientes();
  const multas = useMultasPendientes();
  const historial = useHistorialMultas();
  const devoluciones = useDevolucionesPendientes();

  const refrescando =
    comprobantes.isRefetching || multas.isRefetching || historial.isRefetching || devoluciones.isRefetching;
  const refrescar = () => {
    void comprobantes.refetch();
    void multas.refetch();
    void historial.refetch();
    void devoluciones.refetch();
  };

  return (
    // FormularioConTeclado: el motivo de rechazo (RevisionComprobantes) no queda bajo el teclado.
    <FormularioConTeclado refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} />}>
      <Text className="font-titulo text-2xl text-primary">Revisar y resolver.</Text>
      <View className="mt-3 flex-row flex-wrap">
        <Chip
          etiqueta={conContador('Comprobantes', comprobantes.data?.length)}
          activo={pestana === 'comprobantes'}
          onPress={() => setPestana('comprobantes')}
        />
        <Chip
          etiqueta={conContador('Multas', multas.data?.length)}
          activo={pestana === 'multas'}
          onPress={() => setPestana('multas')}
        />
        <Chip
          etiqueta={conContador('Devoluciones', devoluciones.data?.length)}
          activo={pestana === 'devoluciones'}
          onPress={() => setPestana('devoluciones')}
        />
      </View>

      <View className="mt-2 min-h-48">
        {pestana === 'comprobantes' ? (
          <RevisionComprobantes />
        ) : pestana === 'multas' ? (
          <RevisionMultas />
        ) : (
          <RevisionDevoluciones />
        )}
      </View>
    </FormularioConTeclado>
  );
}
