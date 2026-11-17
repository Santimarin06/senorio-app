// Único lugar de la app que usa expo-notifications (RF-30, D-12): permiso, canal de Android y
// notificaciones locales. Sin push desde un servidor (D-10).
// Documentación: en Android 13 o superior el diálogo de permiso no aparece hasta que exista un
// canal, así que el canal se crea antes de pedirlo.
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { RECORDATORIOS } from '@/config/negocio';
import { PREFIJO_RECORDATORIO, type RecordatorioPorProgramar } from '@/lib/recordatorios';
import { EstadoPermiso } from '@/types/ubicacion';

/** Con la app abierta, la notificación también se muestra (banner y bandeja). */
export const configurarManejador = (): void => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
};

/**
 * Canal "Citas" de Android con importancia alta (aparece arriba de la pantalla).
 * Si falla no se corta el flujo: en Expo Go, setNotificationChannelAsync crea el canal pero
 * rechaza la promesa con un NullPointerException al leerlo de vuelta. Cortar ahí dejaba sin
 * pedir el permiso. Sin el canal, expo-notifications usa su canal por defecto
 * (BaseNotificationBuilder), así que la notificación igual se muestra.
 */
const asegurarCanal = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(RECORDATORIOS.canalId, {
      name: RECORDATORIOS.canalNombre,
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  } catch {
    // Se sigue con el canal por defecto.
  }
};

const traducir = (respuesta: Notifications.NotificationPermissionsStatus): EstadoPermiso => {
  if (respuesta.granted) return EstadoPermiso.CONCEDIDO;
  if (respuesta.status === Notifications.PermissionStatus.UNDETERMINED) {
    return EstadoPermiso.SIN_PREGUNTAR;
  }
  return respuesta.canAskAgain ? EstadoPermiso.DENEGADO : EstadoPermiso.BLOQUEADO;
};

/** Consulta el permiso sin mostrar nada (al abrir y al volver de Ajustes). */
export const revisarPermisoNotificaciones = async (): Promise<EstadoPermiso> =>
  traducir(await Notifications.getPermissionsAsync());

/** Crea el canal y muestra el diálogo del sistema si todavía se puede. */
export const pedirPermisoNotificaciones = async (): Promise<EstadoPermiso> => {
  await asegurarCanal();
  return traducir(await Notifications.requestPermissionsAsync());
};

export const abrirAjustesNotificaciones = (): Promise<void> => Linking.openSettings();

/** Identificadores de las notificaciones programadas en este teléfono. */
export const idsProgramados = async (): Promise<string[]> =>
  (await Notifications.getAllScheduledNotificationsAsync()).map((n) => n.identifier);

/** Programa el recordatorio de una cita con su identificador estable. */
export const programarRecordatorio = async (r: RecordatorioPorProgramar): Promise<void> => {
  await asegurarCanal();
  await Notifications.scheduleNotificationAsync({
    identifier: r.id,
    content: { title: r.titulo, body: r.cuerpo },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: r.fechaMs,
      channelId: RECORDATORIOS.canalId,
    },
  });
};

export const cancelarProgramada = (id: string): Promise<void> =>
  Notifications.cancelScheduledNotificationAsync(id);

/** Muestra ya una notificación local. El mismo id reemplaza a la anterior en vez de repetirla. */
export const mostrarAhora = async (id: string, titulo: string, cuerpo: string): Promise<void> => {
  await asegurarCanal();
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title: titulo, body: cuerpo },
    trigger: Platform.OS === 'android' ? { channelId: RECORDATORIOS.canalId } : null,
  });
};

/** Al cerrar sesión: que el siguiente usuario del teléfono no reciba recordatorios ajenos. */
export const cancelarRecordatorios = async (): Promise<void> => {
  const ids = await idsProgramados();
  await Promise.all(ids.filter((id) => id.startsWith(PREFIJO_RECORDATORIO)).map(cancelarProgramada));
};
