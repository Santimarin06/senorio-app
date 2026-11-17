// Lista de una pestaña de Gestión (RF-26, RF-27, mockup "Lo que ofrece el local"): búsqueda,
// contador de activos, botón para crear y cada elemento con Editar y Desactivar o Reactivar.
// Los estados de carga, error y vacío los pone la pestaña que la usa.
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import CampoTexto from '@/components/CampoTexto';
import EstadoPantalla from '@/components/EstadoPantalla';
import Tarjeta from '@/components/Tarjeta';
import { mensajeDeGestion } from '@/lib/errores';
import { ordenarGestion } from '@/lib/gestion';

export interface ElementoGestion {
  id: string;
  nombre: string;
  activo: boolean;
  subtitulo: string;
  detalle: string;
  imagen?: string | null;
}

interface Props<T extends ElementoGestion> {
  /** "servicio" o "producto": arma los textos ("Nuevo servicio", "3 servicios activos"). */
  singular: string;
  plural: string;
  icono: keyof typeof Ionicons.glyphMap;
  elementos: readonly T[];
  coincide: (elemento: T, consulta: string) => boolean;
  onNuevo: () => void;
  onEditar: (id: string) => void;
  /** Guarda el cambio en la base; la lista se refresca sola al invalidar la caché. */
  cambiarActivo: (id: string, activo: boolean) => Promise<void>;
  refrescando: boolean;
  onRefrescar: () => void;
}

export default function ListaGestion<T extends ElementoGestion>(props: Props<T>) {
  const { singular, plural, elementos, coincide } = props;
  const [consulta, setConsulta] = useState('');
  const [cambiando, setCambiando] = useState<string | null>(null);

  const visibles = ordenarGestion(elementos.filter((e) => coincide(e, consulta)));
  const activos = elementos.filter((e) => e.activo).length;

  const cambiar = (e: T) => {
    const ejecutar = async () => {
      setCambiando(e.id);
      try {
        await props.cambiarActivo(e.id, !e.activo);
      } catch (error) {
        Alert.alert('No se guardó', mensajeDeGestion(error));
      } finally {
        setCambiando(null);
      }
    };
    if (!e.activo) return void ejecutar();
    Alert.alert(
      `¿Desactivar ${e.nombre}?`,
      `Los clientes dejarán de verlo. No se borra: puedes reactivarlo cuando quieras.`,
      [
        { text: 'Volver', style: 'cancel' },
        { text: 'Desactivar', style: 'destructive', onPress: () => void ejecutar() },
      ],
    );
  };

  return (
    <FlatList
      data={visibles}
      keyExtractor={(e) => e.id}
      contentContainerStyle={{ padding: 16, paddingTop: 0, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      onRefresh={props.onRefrescar}
      refreshing={props.refrescando}
      ListHeaderComponent={
        <View>
          <CampoTexto
            etiqueta={`Buscar en los ${plural}`}
            value={consulta}
            onChangeText={setConsulta}
            placeholder="Nombre…"
            returnKeyType="search"
            autoCorrect={false}
          />
          <Text className="mb-3 font-texto text-sm text-secondary">
            {activos} {activos === 1 ? `${singular} activo` : `${plural} activos`} · Precios en COP
          </Text>
          <Boton className="mb-4" onPress={props.onNuevo}>
            {`Nuevo ${singular}`}
          </Boton>
        </View>
      }
      renderItem={({ item }) => (
        <Tarjeta
          titulo={item.activo ? item.nombre : `${item.nombre} · Inactivo`}
          subtitulo={item.subtitulo}
          detalle={item.detalle}
          imagen={item.imagen}
          icono={props.icono}
        >
          <View className="flex-row">
            <Boton
              variante="borde"
              className="mr-2 flex-1"
              onPress={() => props.onEditar(item.id)}
              accessibilityLabel={`Editar ${item.nombre}`}
            >
              Editar
            </Boton>
            <Boton
              variante="borde"
              className="flex-1"
              cargando={cambiando === item.id}
              disabled={cambiando !== null}
              onPress={() => cambiar(item)}
              accessibilityLabel={`${item.activo ? 'Desactivar' : 'Reactivar'} ${item.nombre}`}
            >
              {item.activo ? 'Desactivar' : 'Reactivar'}
            </Boton>
          </View>
        </Tarjeta>
      )}
      ListEmptyComponent={
        elementos.length === 0 ? (
          <EstadoPantalla tipo="vacio" icono={props.icono} mensaje={`Aún no hay ${plural}. Crea el primero.`} />
        ) : (
          <View className="flex-1">
            <EstadoPantalla tipo="vacio" mensaje={`No encontramos ese ${singular}. Prueba otro nombre.`} />
            <Boton variante="borde" className="mx-6" onPress={() => setConsulta('')}>
              Limpiar búsqueda
            </Boton>
          </View>
        )
      }
    />
  );
}
