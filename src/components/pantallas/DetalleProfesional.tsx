// Elegir servicios del profesional (RF-03) por id (ruta dinámica, como products/[id] en navegation-app).
// Si el id no existe se muestra "Profesional no encontrado" (SRS §7), no un Redirect.
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import EstadoPantalla from '@/components/EstadoPantalla';
import Tarjeta from '@/components/Tarjeta';
import { useProfesional } from '@/hooks/useProfesionales';
import { formatoCOP } from '@/lib/dinero';
import { mensajeDeError } from '@/lib/errores';
import { calcularTotalCita, faltaServicioPrincipal } from '@/lib/reserva';
import { useReservaStore } from '@/store/useReservaStore';

export default function DetalleProfesional({ id }: { id: string }) {
  const navigation = useNavigation();
  const { data: profesional, isPending, isError, error, refetch } = useProfesional(id);
  const elegirProfesional = useReservaStore((s) => s.elegirProfesional);
  const seleccionados = useReservaStore((s) => s.servicios);
  const alternarServicio = useReservaStore((s) => s.alternarServicio);

  useEffect(() => {
    if (profesional) {
      navigation.setOptions({ title: profesional.nombre });
      elegirProfesional(profesional); // por si se abrió el enlace directo
    }
  }, [profesional, navigation, elegirProfesional]);

  if (isPending) return <EstadoPantalla tipo="carga" />;
  if (isError)
    return <EstadoPantalla tipo="error" mensaje={mensajeDeError(error)} onReintentar={refetch} />;
  if (!profesional) {
    return (
      <View className="flex-1 bg-fondo">
        <EstadoPantalla
          tipo="vacio"
          icono="person-remove-outline"
          mensaje="Profesional no encontrado. Puede que ya no atienda en el local."
        />
        <View className="p-6">
          <Boton variante="borde" onPress={() => router.back()}>
            Volver a profesionales
          </Boton>
        </View>
      </View>
    );
  }

  const total = calcularTotalCita(seleccionados);
  const soloAdicional = faltaServicioPrincipal(seleccionados);

  return (
    <View className="flex-1 bg-fondo">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Tarjeta titulo={profesional.nombre} subtitulo={profesional.cargo} imagen={profesional.foto} />

        <Text className="mb-2 mt-2 font-texto text-lg text-primary">Elige uno o varios servicios</Text>

        {profesional.servicios.length === 0 ? (
          <Text className="font-texto text-base text-secondary">
            Este profesional todavía no tiene servicios disponibles.
          </Text>
        ) : (
          profesional.servicios.map((servicio) => {
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
                <Text className="font-texto text-base text-primary">{formatoCOP(servicio.precio)}</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <View className="border-t border-borde p-4">
        <Text className="font-texto text-base text-primary">
          Total: {formatoCOP(total.precio)} · {total.duracionMin} min
        </Text>
        {soloAdicional ? (
          <Text className="mt-1 font-texto text-sm text-peligro">
            Un adicional solo se puede reservar junto con un servicio principal.
          </Text>
        ) : null}
        <Text className="mt-1 font-texto text-sm text-secondary">
          El horario semanal (RF-04) se habilita en la siguiente entrega.
        </Text>
      </View>
    </View>
  );
}
