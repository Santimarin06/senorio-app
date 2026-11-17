// Mis citas (RF-08): próximas y pasadas con su estado, leídas de Supabase. Como la base es la
// fuente de verdad, la lista es la misma al cerrar y volver a abrir la app.
import { router } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, SectionList, Text } from 'react-native';

import EstadoPantalla from '@/components/EstadoPantalla';
import PantallaPendiente from '@/components/PantallaPendiente';
import Tarjeta from '@/components/Tarjeta';
import { useMisCitas } from '@/hooks/useCita';
import { estadoVisible } from '@/lib/agenda';
import { formatoFechaHoraBogota } from '@/lib/fechas';
import { ETIQUETA_ESTADO, separarCitas } from '@/models/cita.mapper';

export default function CitasScreen() {
  const { data, isPending, isError, error, refetch, isRefetching } = useMisCitas();

  const secciones = useMemo(() => {
    const { proximas, pasadas } = separarCitas(data ?? [], Date.now());
    return [
      { titulo: 'Próximas', data: proximas },
      { titulo: 'Pasadas', data: pasadas },
    ].filter((s) => s.data.length > 0);
  }, [data]);

  if (isPending) return <EstadoPantalla tipo="carga" mensaje="Cargando tus citas…" />;
  if (isError)
    return <EstadoPantalla tipo="error" error={error} onReintentar={refetch} />;
  if (data.length === 0) {
    return (
      <PantallaPendiente
        icono="calendar-outline"
        mensaje="Aún no tienes citas. Cuando reserves, aparecerán aquí."
        acciones={[{ texto: 'Reservar cita', onPress: () => router.navigate('/reservar') }]}
      />
    );
  }

  return (
    <SectionList
      className="flex-1 bg-fondo"
      contentContainerStyle={{ padding: 16 }}
      sections={secciones}
      keyExtractor={(c) => c.id}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
      renderSectionHeader={({ section }) => (
        <Text className="mb-2 mt-2 bg-fondo font-texto text-lg text-primary">{section.titulo}</Text>
      )}
      renderItem={({ item }) => (
        <Tarjeta
          titulo={item.profesional}
          subtitulo={`${formatoFechaHoraBogota(item.inicio)}\n${ETIQUETA_ESTADO[estadoVisible(item, Date.now())]}`}
          icono="calendar-outline"
          onPress={() => router.push({ pathname: '/cita/[id]', params: { id: item.id } })}
        />
      )}
    />
  );
}
