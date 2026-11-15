// Productos (RF-10, RF-11): catálogo remoto con búsqueda. El cotizador se agrega después.
import { useMemo, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';

import EstadoPantalla from '@/components/EstadoPantalla';
import Tarjeta from '@/components/Tarjeta';
import { useProductos } from '@/hooks/useProductos';
import { filtrarPorTexto } from '@/lib/busqueda';
import { formatoCOP } from '@/lib/dinero';
import { mensajeDeError } from '@/lib/errores';

export default function ListaProductos() {
  const { data, isPending, isError, error, refetch, isRefetching } = useProductos();
  const [consulta, setConsulta] = useState('');

  const filtrados = useMemo(
    () => filtrarPorTexto(data ?? [], consulta, (p) => [p.nombre, p.descripcion]),
    [data, consulta],
  );

  if (isPending) return <EstadoPantalla tipo="carga" mensaje="Cargando productos…" />;
  if (isError)
    return <EstadoPantalla tipo="error" mensaje={mensajeDeError(error)} onReintentar={refetch} />;
  if (data.length === 0)
    return <EstadoPantalla tipo="vacio" mensaje="Todavía no hay productos en el catálogo." />;

  return (
    <View className="flex-1 bg-fondo">
      <TextInput
        value={consulta}
        onChangeText={setConsulta}
        placeholder="Buscar producto"
        placeholderTextColor="#9A9A9A"
        className="mx-4 mt-4 rounded-lg border border-borde px-4 py-3 font-texto text-base text-primary"
        accessibilityLabel="Buscar producto"
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
            subtitulo={item.descripcion}
            detalle={formatoCOP(item.precio)}
            imagen={item.foto}
            icono="bag-outline"
          />
        )}
        ListEmptyComponent={
          <EstadoPantalla tipo="vacio" mensaje={`Ningún producto coincide con "${consulta}".`} />
        }
      />
    </View>
  );
}
