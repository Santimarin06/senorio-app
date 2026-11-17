// Hook propio: sincroniza los recordatorios y avisos del profesional (RF-30, D-10, D-47).
//
// Entradas: profesionalId (la ficha de la sesión). Se monta en las Tabs del profesional.
// Efectos: al abrir, al volver a primer plano y cada minuto con la app abierta:
//   1. revisa el permiso (lo pide una vez si nunca se preguntó; Android 13+ necesita el canal);
//   2. lee las citas de los próximos 14 días y programa un recordatorio 30 minutos antes de cada
//      una, cancelando los de citas canceladas o reagendadas y sin duplicar (planRecordatorios);
//   3. lee los avisos de la base y muestra como notificación local los que el teléfono no ha
//      mostrado; luego los marca como mostrados en la base.
// Sin permiso no programa ni muestra nada, pero los avisos siguen en la base y en la tab.
// Sin conexión no cancela nada: los recordatorios ya programados siguen sonando.
// No hay push desde un servidor: con la app cerrada, el aviso de cita nueva llega al abrirla.
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { RECORDATORIOS } from '@/config/negocio';
import { CLAVE_AVISOS } from '@/hooks/useAvisos';
import { fechaBogota } from '@/lib/agenda';
import { sumarDias } from '@/lib/disponibilidad';
import { avisosPorMostrar, idAviso, planRecordatorios, textoAviso } from '@/lib/recordatorios';
import { getAgenda } from '@/services/agenda.api';
import { getAvisos, marcarMostrados } from '@/services/avisos.api';
import {
  cancelarProgramada,
  idsProgramados,
  mostrarAhora,
  programarRecordatorio,
} from '@/services/notificaciones';
import { usePermisosStore } from '@/store/usePermisosStore';
import { EstadoPermiso } from '@/types/ubicacion';

const UN_MINUTO = 60_000;

export const useRecordatorios = (profesionalId: string | null) => {
  const queryClient = useQueryClient();
  const revisarPermiso = usePermisosStore((s) => s.revisarNotificaciones);
  const pedirPermiso = usePermisosStore((s) => s.pedirNotificaciones);
  // Evita dos sincronizaciones a la vez (por ejemplo, al abrir y al volver a primer plano).
  const sincronizando = useRef(false);

  const sincronizar = useCallback(async () => {
    if (!profesionalId || sincronizando.current) return;
    sincronizando.current = true;
    try {
      let permiso = await revisarPermiso();
      if (permiso === EstadoPermiso.SIN_PREGUNTAR) permiso = await pedirPermiso();
      const concedido = permiso === EstadoPermiso.CONCEDIDO;

      // 2. Recordatorios de las citas futuras.
      if (concedido) {
        const hoy = fechaBogota(new Date().toISOString());
        const citas = await getAgenda({
          desde: hoy,
          hasta: sumarDias(hoy, RECORDATORIOS.diasAdelante + 1),
          profesionalId,
        });
        const plan = planRecordatorios(citas, await idsProgramados(), Date.now());
        await Promise.all(plan.cancelar.map(cancelarProgramada));
        await Promise.all(plan.programar.map(programarRecordatorio));
      }

      // 3. Avisos guardados en la base.
      const avisos = await getAvisos();
      const { notificar, marcarSinNotificar } = avisosPorMostrar(avisos, Date.now());
      if (concedido) {
        for (const aviso of notificar) {
          const { titulo, cuerpo } = textoAviso(aviso);
          await mostrarAhora(idAviso(aviso.id), titulo, cuerpo);
        }
      }
      // Sin permiso, los recientes quedan sin marcar para mostrarlos cuando lo conceda.
      const mostrados = concedido ? [...notificar, ...marcarSinNotificar] : marcarSinNotificar;
      await marcarMostrados(mostrados.map((a) => a.id));
    } catch {
      // Sin conexión o error del servidor: se intenta de nuevo en la siguiente sincronización.
    } finally {
      sincronizando.current = false;
      void queryClient.invalidateQueries({ queryKey: CLAVE_AVISOS });
    }
  }, [profesionalId, revisarPermiso, pedirPermiso, queryClient]);

  useEffect(() => {
    void sincronizar();
    const suscripcion = AppState.addEventListener('change', (siguiente) => {
      if (siguiente === 'active') void sincronizar();
    });
    // Con la app abierta, una cita nueva llega en menos de un minuto.
    const intervalo = setInterval(() => {
      if (AppState.currentState === 'active') void sincronizar();
    }, UN_MINUTO);
    return () => {
      suscripcion.remove();
      clearInterval(intervalo);
    };
  }, [sincronizar]);

  return { sincronizar };
};
