// Elegir servicios del profesional (RF-03) por id (ruta dinámica, como products/[id] en navegation-app).
// Si el id no existe se muestra "Profesional no encontrado" (SRS §7), no un Redirect.
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import Boton from '@/components/Boton';
import EstadoPantalla from '@/components/EstadoPantalla';
import Tarjeta from '@/components/Tarjeta';
import { useProfesional } from '@/hooks/useProfesionales';
import { filtrarPorTexto } from '@/lib/busqueda';
import { formatoCOP } from '@/lib/dinero';
import { faltaServicioPrincipal, totalSeleccion } from '@/lib/reserva';
import { useReservaStore } from '@/store/useReservaStore';

export default function DetalleProfesional({ id }: { id: string }) {
  const navigation = useNavigation();
  const { data: profesional, isPending, isError, error, refetch } = useProfesional(id);
  const elegirProfesional = useReservaStore((s) => s.elegirProfesional);
  const seleccionados = useReservaStore((s) => s.servicios);
  const alternarServicio = useReservaStore((s) => s.alternarServicio);
  const [consulta, setConsulta] = useState('');

  // RF-11: los servicios elegidos siguen en el total aunque la búsqueda los oculte.
  const serviciosFiltrados = useMemo(
    () => filtrarPorTexto(profesional?.servicios ?? [], consulta, (s) => [s.nombre, s.descripcion]),
    [profesional, consulta],
  );

  useEffect(() => {
    if (profesional) {
      navigation.setOptions({ title: profesional.nombre });
      elegirProfesional(profesional); // por si se abrió el enlace directo
    }
  }, [profesional, navigation, elegirProfesional]);

  if (isPending) return <EstadoPantalla tipo="carga" />;
  if (isError)
    return <EstadoPantalla tipo="error" error={error} onReintentar={refetch} />;
  if (!profesional) {
    return (
      <EstadoPantalla
        tipo="vacio"
        icono="person-remove-outline"
        titulo="Profesional no encontrado"
        mensaje="Este perfil ya no está disponible."
        accion={{ texto: 'Ver profesionales', onPress: () => router.navigate('/reservar') }}
      />
    );
  }

  const total = totalSeleccion(seleccionados);
  const soloAdicional = faltaServicioPrincipal(seleccionados);

  return (
    <View className="flex-1 bg-fondo">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Tarjeta
          titulo={profesional.nombre}
          subtitulo={profesional.cargo}
          imagen={profesional.foto}
          imagenGrande
        />

        <Text className="mb-2 mt-2 font-texto text-lg text-primary">
          Elige uno o varios servicios
        </Text>

        {profesional.servicios.length > 0 ? (
          <TextInput
            value={consulta}
            onChangeText={setConsulta}
            placeholder={`Buscar un servicio de ${profesional.nombre}`}
            placeholderTextColor="#9A9A9A"
            className="mb-3 rounded-lg border border-borde px-4 py-3 font-texto text-base text-primary"
            accessibilityLabel="Buscar un servicio"
          />
        ) : null}

        {profesional.servicios.length === 0 ? (
          <Text className="font-texto text-base text-secondary">
            Este profesional todavía no tiene servicios disponibles.
          </Text>
        ) : serviciosFiltrados.length === 0 ? (
          <View className="items-center py-6">
            <Ionicons name="search-outline" size={40} color="#9A9A9A" />
            <Text className="my-3 text-center font-texto text-base text-secondary">
              Ningún servicio coincide con &quot;{consulta}&quot;.
            </Text>
            <Boton variante="borde" onPress={() => setConsulta('')}>
              Limpiar búsqueda
            </Boton>
          </View>
        ) : (
          serviciosFiltrados.map((servicio) => {
            const elegido = seleccionados.some((s) => s.id === servicio.id);
            return (
              <Pressable
                key={servicio.id}
                onPress={() => alternarServicio(servicio)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: elegido }}
                className={`mb-2 flex-row items-center rounded-lg border p-3 ${
                  elegido ? 'border-primary bg-borde' : 'border-borde'
                }`}
              >
                <Ionicons
                  name={elegido ? 'checkbox' : 'square-outline'}
                  size={22}
                  color="#111111"
                />
                <View className="ml-3 flex-1">
                  <Text className="font-texto text-base text-primary">
                    {servicio.nombre}
                    {servicio.esAdicional ? ' (adicional)' : ''}
                  </Text>
                  <Text className="font-texto text-sm text-secondary">
                    {servicio.duracionMin > 0 ? `${servicio.duracionMin} min` : 'Sin tiempo extra'}
                  </Text>
                </View>
                <Text className="font-texto text-base text-primary">
                  {formatoCOP(servicio.precio)}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <View className="border-t border-borde p-4">
        <Text className="font-texto text-base text-primary">
          Total: {formatoCOP(total.total)} · {total.duracionMin} min
        </Text>
        {soloAdicional ? (
          <Text className="mt-1 font-texto text-sm text-peligro">
            Un adicional solo se puede reservar junto con un servicio principal.
          </Text>
        ) : null}
        <Boton
          className="mt-3"
          disabled={seleccionados.length === 0 || soloAdicional}
          onPress={() => router.push('/reservar/horario')}
        >
          Elegir horario
        </Boton>
      </View>
    </View>
  );
}
