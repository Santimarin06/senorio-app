// Bloqueos vigentes (RF-24, D-24): franjas que dejan de ofrecerse por días libres o imprevistos,
// de un profesional o de todo el local. Al cliente se le muestran como "Ocupada".
import { router } from 'expo-router';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import EstadoPantalla from '@/components/EstadoPantalla';
import { useBloqueos, useQuitarBloqueo } from '@/hooks/useDiasTrabajo';
import { fechaBogota, horaBogota } from '@/lib/agenda';
import { mensajeDeDiasTrabajo, mensajeDeError } from '@/lib/errores';
import { etiquetaDia, mayuscula } from '@/lib/fechas';
import type { Bloqueo } from '@/types/entidades';

export default function Bloqueos() {
  const { data, isPending, isError, error, refetch, isRefetching } = useBloqueos();
  const quitar = useQuitarBloqueo();

  const onQuitar = (bloqueo: Bloqueo) =>
    Alert.alert(
      '¿Quitar el bloqueo?',
      'Esas franjas se vuelven a ofrecer a los clientes.',
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: () =>
            quitar.mutate(bloqueo.id, {
              onError: (e) => Alert.alert('No se quitó', mensajeDeDiasTrabajo(e)),
            }),
        },
      ],
    );

  const encabezado = (
    <View className="mb-4">
      <Text className="font-texto text-base text-secondary">
        Lo bloqueado deja de ofrecerse al cliente: en su horario semanal se ve como
        &quot;Ocupada&quot;. Las citas que ya estaban reservadas no se cancelan.
      </Text>
      <Boton className="mt-3" onPress={() => router.push('/panel/bloqueo-nuevo')}>
        Nuevo bloqueo
      </Boton>
    </View>
  );

  if (isPending) return <EstadoPantalla tipo="carga" mensaje="Cargando los bloqueos…" />;
  if (isError) {
    return <EstadoPantalla tipo="error" mensaje={mensajeDeError(error)} onReintentar={refetch} />;
  }

  return (
    <ScrollView
      className="flex-1 bg-fondo"
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
    >
      {encabezado}
      {data.length === 0 ? (
        <Text className="font-texto text-base text-secondary">No hay bloqueos vigentes.</Text>
      ) : (
        data.map((b) => (
          <View key={b.id} className="mb-3 rounded-xl border border-borde p-4">
            <Text className="font-texto text-base text-primary">{b.profesional ?? 'Todo el local'}</Text>
            <Text className="font-texto text-sm text-primary">
              {mayuscula(etiquetaDia(fechaBogota(b.inicio)).largo)} · {horaBogota(b.inicio)} –{' '}
              {horaBogota(b.fin)}
            </Text>
            <Text className="font-texto text-sm text-secondary">{b.motivo}</Text>
            <Boton
              className="mt-3"
              variante="borde"
              onPress={() => onQuitar(b)}
              cargando={quitar.isPending && quitar.variables === b.id}
              disabled={quitar.isPending}
            >
              Quitar
            </Boton>
          </View>
        ))
      )}
    </ScrollView>
  );
}
