// Cita registrada (RF-07). Llega con ?citaId= y la lee de la base antes de decir "registrada":
// nunca se muestra como guardada una cita que no está en Supabase (RN-12, RN-14).
// El aviso por WhatsApp es opcional: la cita ya quedó guardada aunque no se envíe.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import PantallaPendiente from '@/components/PantallaPendiente';
import ConCita from '@/components/pantallas/ConCita';
import { useIdDeRuta } from '@/hooks/useIdDeRuta';
import { formatoFechaHoraBogota } from '@/lib/fechas';
import { formatoCOP } from '@/lib/finanzas';
import { enlaceWhatsApp, mensajeReserva } from '@/lib/whatsapp';
import { useSesionStore } from '@/store/useSesionStore';

export default function ConfirmacionScreen() {
  const citaId = useIdDeRuta('citaId');
  const cliente = useSesionStore((s) => s.usuario?.nombre ?? '');
  const [errorWhatsApp, setErrorWhatsApp] = useState(false);

  if (citaId === '') {
    return (
      <PantallaPendiente
        icono="calendar-clear-outline"
        mensaje="No hay una cita recién registrada."
        acciones={[{ texto: 'Ir al inicio', onPress: () => router.navigate('/inicio') }]}
      />
    );
  }

  return (
    <ConCita id={citaId}>
      {(cita) => {
        const avisar = async () => {
          setErrorWhatsApp(false);
          const enlace = enlaceWhatsApp(
            mensajeReserva({
              cliente,
              profesional: cita.profesional,
              servicios: cita.servicios.map((s) => s.nombre),
              fechaHora: formatoFechaHoraBogota(cita.inicio),
              total: cita.total,
            }),
          );
          try {
            await Linking.openURL(enlace);
          } catch {
            setErrorWhatsApp(true);
          }
        };

        return (
          <ScrollView className="flex-1 bg-fondo" contentContainerStyle={{ padding: 24 }}>
            <View className="mb-6 items-center">
              <Ionicons name="checkmark-circle" size={56} color="#111111" />
              <Text className="mt-2 font-titulo text-2xl text-primary">Nos vemos en la silla</Text>
              <Text className="text-center font-texto text-base text-secondary">
                Tu cita quedó registrada.
              </Text>
            </View>

            <View className="mb-6 rounded-xl border border-borde p-4">
              <Text className="font-titulo text-lg text-primary">{cita.profesional}</Text>
              <Text className="mb-2 font-texto text-base text-secondary">
                {formatoFechaHoraBogota(cita.inicio)}
              </Text>
              <Text className="font-texto text-base text-primary">
                {cita.servicios.map((s) => s.nombre).join(', ')}
              </Text>
              <Text className="mt-2 font-titulo text-base text-primary">{formatoCOP(cita.total)}</Text>
            </View>

            <Text className="mb-3 font-texto text-sm text-secondary">
              Avísale al local por WhatsApp: el mensaje ya va escrito, solo pulsas enviar.
            </Text>
            <Boton className="mb-3" onPress={avisar}>
              Avisar por WhatsApp
            </Boton>
            {errorWhatsApp ? (
              <Text className="mb-3 font-texto text-sm text-peligro">
                No pudimos abrir WhatsApp. Tu cita sigue registrada.
              </Text>
            ) : null}
            <Boton
              variante="borde"
              className="mb-3"
              onPress={() => router.navigate({ pathname: '/cita/[id]', params: { id: cita.id } })}
            >
              Ver mi cita
            </Boton>
            <Boton variante="texto" onPress={() => router.navigate('/inicio')}>
              Ir al inicio
            </Boton>
          </ScrollView>
        );
      }}
    </ConCita>
  );
}
