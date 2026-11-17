// Tab Avisos del profesional (RF-30, D-10, D-47): estado del permiso y de los recordatorios de
// este teléfono, y la lista de avisos guardados en la base (citas nuevas, reagendadas y
// canceladas). Tocar un aviso lo marca como leído.
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import EstadoPantalla from '@/components/EstadoPantalla';
import { RECORDATORIOS } from '@/config/negocio';
import { useAhora } from '@/hooks/useAgenda';
import { useAvisos, useMarcarLeidos, useRecordatoriosProgramados } from '@/hooks/useAvisos';
import { usePermisoNotificaciones } from '@/hooks/usePermisoNotificaciones';
import { mensajeDeError } from '@/lib/errores';
import { haceCuanto, textoAviso } from '@/lib/recordatorios';
import { abrirAjustesNotificaciones } from '@/services/notificaciones';
import type { Aviso, TipoAviso } from '@/types/entidades';
import { EstadoPermiso } from '@/types/ubicacion';

const ICONO: Record<TipoAviso, keyof typeof Ionicons.glyphMap> = {
  cita_nueva: 'calendar-outline',
  cita_reagendada: 'swap-horizontal-outline',
  cita_cancelada: 'close-circle-outline',
};

export default function Avisos() {
  const ahora = useAhora(60_000);
  const { data, isPending, isError, error, refetch, isRefetching } = useAvisos();
  const marcar = useMarcarLeidos();

  if (isPending) return <EstadoPantalla tipo="carga" mensaje="Cargando tus avisos…" />;
  if (isError) {
    return (
      <EstadoPantalla tipo="error" mensaje={mensajeDeError(error)} onReintentar={() => void refetch()} />
    );
  }

  const noLeidos = data.filter((a) => !a.leida).map((a) => a.id);

  return (
    <FlatList
      className="flex-1 bg-fondo"
      contentContainerClassName="p-4 flex-grow"
      data={data}
      keyExtractor={(a) => a.id}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
      ListHeaderComponent={
        <View>
          <TarjetaPermiso />
          {marcar.isError ? (
            <Text className="mb-3 font-texto text-sm text-peligro">
              {mensajeDeError(marcar.error)} No se marcó ningún aviso.
            </Text>
          ) : null}
          {noLeidos.length > 0 ? (
            <Boton
              variante="borde"
              className="mb-3"
              cargando={marcar.isPending}
              onPress={() => marcar.mutate(noLeidos)}
            >
              {`Marcar todas como leídas (${noLeidos.length})`}
            </Boton>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <EstadoPantalla
          tipo="vacio"
          icono="notifications-off-outline"
          mensaje="Aún no tienes avisos. Aquí verás las citas que te reserven, reagenden o cancelen."
        />
      }
      renderItem={({ item }) => (
        <FilaAviso
          aviso={item}
          ahoraMs={ahora}
          onPress={() => {
            if (!item.leida && !marcar.isPending) marcar.mutate([item.id]);
          }}
        />
      )}
    />
  );
}

function FilaAviso({ aviso, ahoraMs, onPress }: { aviso: Aviso; ahoraMs: number; onPress: () => void }) {
  const { titulo, cuerpo } = textoAviso(aviso);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${cuerpo}. ${aviso.leida ? 'Leído' : 'Sin leer'}`}
      className={`mb-3 flex-row rounded-xl border p-3 active:opacity-80 ${
        aviso.leida ? 'border-borde bg-fondo' : 'border-primary bg-fondo'
      }`}
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-borde">
        <Ionicons name={ICONO[aviso.tipo]} size={22} color="#111111" />
      </View>
      <View className="ml-3 flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="font-texto text-base text-primary">{titulo}</Text>
          <Text className="font-texto text-xs text-secondary">{haceCuanto(aviso.creadaEn, ahoraMs)}</Text>
        </View>
        <Text className="mt-1 font-texto text-sm text-secondary">{cuerpo}</Text>
      </View>
      {!aviso.leida ? <View className="ml-2 mt-1 h-2.5 w-2.5 rounded-full bg-primary" /> : null}
    </Pressable>
  );
}

/** Permiso de notificaciones y recordatorios programados en este teléfono. */
function TarjetaPermiso() {
  const { estado, pedirPermiso } = usePermisoNotificaciones();
  const { data: programados } = useRecordatoriosProgramados();
  const [falloPermiso, setFalloPermiso] = useState(false);

  const activar = () => {
    setFalloPermiso(false);
    pedirPermiso().catch(() => setFalloPermiso(true));
  };

  if (estado === EstadoPermiso.VERIFICANDO) return null;

  if (estado === EstadoPermiso.CONCEDIDO) {
    return (
      <View className="mb-3 flex-row items-center rounded-xl bg-borde p-3">
        <Ionicons name="alarm-outline" size={20} color="#111111" />
        <Text className="ml-2 flex-1 font-texto text-sm text-primary">
          {programados === undefined
            ? `Te avisaremos ${RECORDATORIOS.minutosAntes} minutos antes de cada cita.`
            : programados === 1
              ? `1 recordatorio programado en este teléfono, ${RECORDATORIOS.minutosAntes} minutos antes de la cita.`
              : `${programados} recordatorios programados en este teléfono, ${RECORDATORIOS.minutosAntes} minutos antes de cada cita.`}
        </Text>
      </View>
    );
  }

  // Denegado se puede volver a pedir con el diálogo; bloqueado, solo desde Ajustes.
  const bloqueado = estado === EstadoPermiso.BLOQUEADO;
  return (
    <View className="mb-3 rounded-xl border border-borde p-3">
      <Text className="font-texto text-base text-primary">Notificaciones desactivadas</Text>
      <Text className="mb-3 mt-1 font-texto text-sm text-secondary">
        {`Actívalas para recibir el recordatorio ${RECORDATORIOS.minutosAntes} minutos antes de cada cita y el aviso de las citas nuevas. Mientras tanto, tus avisos siguen apareciendo en esta lista.`}
      </Text>
      {bloqueado ? (
        <Boton onPress={() => void abrirAjustesNotificaciones()}>Abrir ajustes</Boton>
      ) : (
        <Boton onPress={activar}>Activar notificaciones</Boton>
      )}
      {falloPermiso ? (
        <Text className="mt-2 font-texto text-sm text-peligro">
          No pudimos pedir el permiso. Actívalo desde Ajustes.
        </Text>
      ) : null}
    </View>
  );
}
