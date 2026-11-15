// Elegir profesional (RF-02, RF-11): listado remoto + búsqueda, con carga, error, vacío y reintento.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';

import EstadoPantalla from '@/components/EstadoPantalla';
import Tarjeta from '@/components/Tarjeta';
import { useProfesionales } from '@/hooks/useProfesionales';
import { filtrarPorTexto } from '@/lib/busqueda';
import { mensajeDeError } from '@/lib/errores';
import { useReservaStore } from '@/store/useReservaStore';
import type { Profesional } from '@/types/entidades';

export default function ListaProfesionales() {
  const { data, isPending, isError, error, refetch, isRefetching } = useProfesionales();
  const elegirProfesional = useReservaStore((s) => s.elegirProfesional);
  const [consulta, setConsulta] = useState('');

  const filtrados = useMemo(
    () => filtrarPorTexto(data ?? [], consulta, (p) => [p.nombre, p.cargo]),
    [data, consulta],
  );

  if (isPending) return <EstadoPantalla tipo="carga" mensaje="Cargando profesionales…" />;
  if (isError)
    return <EstadoPantalla tipo="error" mensaje={mensajeDeError(error)} onReintentar={refetch} />;
  if (data.length === 0)
    return <EstadoPantalla tipo="vacio" mensaje="Todavía no hay profesionales disponibles." />;

  const abrir = (profesional: Profesional) => {
    elegirProfesional(profesional);
    router.push({ pathname: '/reservar/[profesionalId]', params: { profesionalId: profesional.id } });
  };

  return (
    <View className="flex-1 bg-fondo">
      <TextInput
        value={consulta}
        onChangeText={setConsulta}
        placeholder="Buscar por nombre o cargo"
        placeholderTextColor="#9A9A9A"
        className="mx-4 mt-4 rounded-lg border border-borde px-4 py-3 font-texto text-base text-primary"
        accessibilityLabel="Buscar profesional"
      />
      <FlatList
        data={filtrados}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        onRefresh={refetch}
        refreshing={isRefetching}
        renderItem={({ item }) => (
          <Tarjeta
            titulo={item.nombre}
            subtitulo={item.cargo}
            imagen={item.foto}
            onPress={() => abrir(item)}
          />
        )}
        ListEmptyComponent={
          <EstadoPantalla tipo="vacio" mensaje={`Ningún profesional coincide con "${consulta}".`} />
        }
      />
    </View>
  );
}
