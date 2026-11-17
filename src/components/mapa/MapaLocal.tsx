// Mapa de la barbería con la ubicación del dispositivo (RF-12). Equivale a CustomMap de Mapas:
// - "Centrar mi ubicación" (en clase "Usar mi GPS")
// - Activar / Pausar / Reanudar seguimiento
// - "Volver al local" (en clase "Volver a Dosquebradas")
// El seguimiento se detiene al salir de la pantalla (useFocusEffect) para liberar la suscripción.
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import MapaLeaflet, { MapaLeafletRef } from '@/components/mapa/MapaLeaflet';
import { NEGOCIO, UBICACION_LOCAL } from '@/config/negocio';
import { usePermisoUbicacion } from '@/hooks/usePermisoUbicacion';
import { abrirAjustes } from '@/services/ubicacion/permisos';
import { gpsEncendido } from '@/services/ubicacion/ubicacion';
import { useUbicacionStore } from '@/store/useUbicacionStore';
import { EstadoPermiso } from '@/types/ubicacion';

type Seguimiento = 'apagado' | 'activo' | 'pausado';

export default function MapaLocal() {
  const mapaRef = useRef<MapaLeafletRef>(null);
  const [mapaListo, setMapaListo] = useState(false);
  const [mapaFallo, setMapaFallo] = useState(false);
  const [seguimiento, setSeguimiento] = useState<Seguimiento>('apagado');
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [intentoMapa, setIntentoMapa] = useState(0);

  const { estado, pedirPermiso } = usePermisoUbicacion();
  const ultimaUbicacion = useUbicacionStore((s) => s.ultimaUbicacion);
  const obtenerUbicacion = useUbicacionStore((s) => s.obtenerUbicacion);
  const iniciarSeguimiento = useUbicacionStore((s) => s.iniciarSeguimiento);
  const detenerSeguimiento = useUbicacionStore((s) => s.detenerSeguimiento);

  // Al salir de la pantalla (o desmontarla) se libera la suscripción del GPS.
  useFocusEffect(
    useCallback(() => {
      return () => {
        detenerSeguimiento();
        setSeguimiento((s) => (s === 'activo' ? 'pausado' : s));
      };
    }, [detenerSeguimiento]),
  );

  // Si el permiso se retira desde Ajustes mientras se seguía, se detiene.
  useEffect(() => {
    if (estado !== EstadoPermiso.CONCEDIDO && estado !== EstadoPermiso.VERIFICANDO) {
      detenerSeguimiento();
      setSeguimiento('apagado');
    }
  }, [estado, detenerSeguimiento]);

  // Con el seguimiento activo, cada nueva posición mueve el punto y el mapa.
  useEffect(() => {
    if (!ultimaUbicacion || !mapaListo) return;
    mapaRef.current?.marcarDispositivo(ultimaUbicacion);
    if (seguimiento === 'activo') mapaRef.current?.centrarEn(ultimaUbicacion);
  }, [ultimaUbicacion, seguimiento, mapaListo]);

  /** Pide el permiso si hace falta y revisa el GPS. Devuelve true si se puede ubicar. */
  const asegurarUbicacion = async (): Promise<boolean> => {
    let permiso = estado;
    if (permiso !== EstadoPermiso.CONCEDIDO && permiso !== EstadoPermiso.BLOQUEADO) {
      permiso = await pedirPermiso();
    }
    if (permiso === EstadoPermiso.BLOQUEADO) {
      Alert.alert(
        'Permiso de ubicación desactivado',
        'Para ver tu ubicación, habilita el permiso en los ajustes del teléfono.',
        [
          { text: 'Abrir ajustes', onPress: () => void abrirAjustes() },
          { text: 'Ahora no', style: 'cancel' },
        ],
      );
      return false;
    }
    if (permiso !== EstadoPermiso.CONCEDIDO) {
      setAviso('Sin permiso de ubicación. Puedes seguir viendo dónde está el local.');
      return false;
    }
    if (!(await gpsEncendido())) {
      setAviso('El GPS del teléfono está apagado. Enciéndelo e inténtalo de nuevo.');
      return false;
    }
    setAviso(null);
    return true;
  };

  const centrarMiUbicacion = async () => {
    setOcupado(true);
    try {
      if (!(await asegurarUbicacion())) return;
      const ubicacion = await obtenerUbicacion();
      mapaRef.current?.marcarDispositivo(ubicacion);
      mapaRef.current?.centrarEn(ubicacion);
    } catch {
      setAviso('No pudimos obtener tu ubicación. Revisa el GPS e inténtalo de nuevo.');
    } finally {
      setOcupado(false);
    }
  };

  const activarOReanudar = async () => {
    setOcupado(true);
    try {
      if (!(await asegurarUbicacion())) return;
      // false: se salió del mapa mientras se pedía la suscripción; el store ya la liberó.
      if (await iniciarSeguimiento()) setSeguimiento('activo');
    } catch {
      setAviso('No pudimos iniciar el seguimiento. Revisa el GPS e inténtalo de nuevo.');
    } finally {
      setOcupado(false);
    }
  };

  const pausar = () => {
    detenerSeguimiento();
    setSeguimiento('pausado');
  };

  const volverAlLocal = () => {
    pausar();
    mapaRef.current?.centrarEn(UBICACION_LOCAL);
  };

  const reintentarMapa = () => {
    setMapaFallo(false);
    setMapaListo(false);
    setIntentoMapa((n) => n + 1); // nueva key = WebView nueva
  };

  const textoSeguimiento = {
    apagado: 'Seguimiento apagado',
    activo: 'Siguiendo tu ubicación',
    pausado: 'Seguimiento en pausa',
  }[seguimiento];

  return (
    <View className="flex-1 bg-fondo">
      {mapaFallo ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="mb-4 text-center font-texto text-base text-primary">
            No se pudo cargar el mapa. Revisa tu conexión.
          </Text>
          <Boton onPress={reintentarMapa}>Reintentar</Boton>
        </View>
      ) : (
        <MapaLeaflet
          key={intentoMapa}
          ref={mapaRef}
          local={UBICACION_LOCAL}
          tituloLocal={NEGOCIO.nombre}
          onListo={() => setMapaListo(true)}
          onArrastre={() => {
            if (seguimiento === 'activo') pausar();
          }}
          onFallo={() => setMapaFallo(true)}
        />
      )}

      <View className="border-t border-borde bg-fondo p-4">
        <Text className="mb-1 font-texto text-base text-primary">{NEGOCIO.direccion}</Text>
        <Text className="font-texto text-sm text-secondary">
          Marcador: {NEGOCIO.nombre}. Punto azul: tu dispositivo. {textoSeguimiento}.
        </Text>
        {aviso ? <Text className="mt-1 font-texto text-sm text-peligro">{aviso}</Text> : null}

        <View className="mt-3 flex-row gap-2">
          <Boton className="flex-1" cargando={ocupado} onPress={() => void centrarMiUbicacion()}>
            Centrar mi ubicación
          </Boton>
          {seguimiento === 'activo' ? (
            <Boton className="flex-1" variante="borde" onPress={pausar}>
              Pausar seguimiento
            </Boton>
          ) : (
            <Boton
              className="flex-1"
              variante="borde"
              disabled={ocupado}
              onPress={() => void activarOReanudar()}
            >
              {seguimiento === 'pausado' ? 'Reanudar seguimiento' : 'Activar seguimiento'}
            </Boton>
          )}
        </View>
        <Boton className="mt-2" variante="texto" onPress={volverAlLocal}>
          Volver al local
        </Boton>
      </View>
    </View>
  );
}
