// Hook propio: elegir la imagen del comprobante con la cámara o la galería (RF-13).
// Mismo patrón que usePermisoUbicacion: revisa el permiso de cámara al montar y cada vez que
// la app vuelve a primer plano (por ejemplo, al regresar de Ajustes).
//
// Entradas: opciones de la imagen (por defecto, las del comprobante; la foto de un producto
// pasa las de FOTOS y pide recorte cuadrado, RF-27).
// Estado: permiso de cámara, imagen elegida, error de validación y si está leyendo el archivo.
// Resultado: { permisoCamara, imagen, error, leyendo, tomarFoto, elegirDeGaleria, abrirAjustes, limpiar }.
//
// La galería usa el selector del sistema, que no necesita permiso (iOS 14+ y Android 13+).
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { COMPROBANTE } from '@/config/negocio';
import { bytesDeBase64, validarArchivoComprobante } from '@/lib/comprobante';
import type { ImagenComprobante } from '@/types/entidades';

/** sin-preguntar: aún no se pidió; denegado: se puede volver a pedir; bloqueado: solo en Ajustes. */
export type EstadoPermisoCamara = 'sin-preguntar' | 'concedido' | 'denegado' | 'bloqueado';

const aEstado = (r: ImagePicker.CameraPermissionResponse): EstadoPermisoCamara => {
  if (r.granted) return 'concedido';
  if (!r.canAskAgain) return 'bloqueado';
  return r.status === 'undetermined' ? 'sin-preguntar' : 'denegado';
};

export interface OpcionesImagen {
  calidad: number;
  tamanoMaximoBytes: number;
  /** Abre el editor del sistema para recortar la imagen cuadrada. */
  cuadrada?: boolean;
}

const COMPROBANTE_OPCIONES: OpcionesImagen = {
  calidad: COMPROBANTE.calidad,
  tamanoMaximoBytes: COMPROBANTE.tamanoMaximoBytes,
};

export const useElegirImagen = (opciones: OpcionesImagen = COMPROBANTE_OPCIONES) => {
  const opcionesPicker: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: opciones.calidad,
    // Los bytes llegan en base64: leer asset.uri con fetch falla en Expo Go (ver bytesDeBase64).
    base64: true,
    ...(opciones.cuadrada ? { allowsEditing: true, aspect: [1, 1] as [number, number] } : {}),
  };
  const [permisoCamara, setPermisoCamara] = useState<EstadoPermisoCamara>('sin-preguntar');
  const [imagen, setImagen] = useState<ImagenComprobante | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leyendo, setLeyendo] = useState(false);

  const revisarPermiso = useCallback(async () => {
    const estado = aEstado(await ImagePicker.getCameraPermissionsAsync());
    // Android informa "denegado" aunque nunca se haya preguntado: ese aviso solo se muestra
    // después de que la persona pulse "Tomar foto".
    setPermisoCamara((antes) =>
      antes === 'sin-preguntar' && estado === 'denegado' ? 'sin-preguntar' : estado,
    );
  }, []);

  useEffect(() => {
    void revisarPermiso();
    const suscripcion = AppState.addEventListener('change', (siguiente) => {
      if (siguiente === 'active') void revisarPermiso();
    });
    return () => suscripcion.remove();
  }, [revisarPermiso]);

  /** Lee los bytes del archivo y lo valida antes de aceptarlo: nada se sube todavía. */
  const procesar = async (resultado: ImagePicker.ImagePickerResult) => {
    const asset = resultado.canceled ? undefined : resultado.assets[0];
    if (!asset) return; // el usuario canceló: se conserva lo que había
    setLeyendo(true);
    setError(null);
    try {
      const bytes = asset.base64 ? bytesDeBase64(asset.base64) : null;
      if (!bytes) {
        setImagen(null);
        setError('No pudimos leer la imagen. Elige otra.');
        return;
      }
      const validacion = validarArchivoComprobante(bytes, opciones.tamanoMaximoBytes);
      if (!validacion.ok) {
        setImagen(null);
        setError(validacion.error);
        return;
      }
      const extension = validacion.mime === 'image/png' ? 'png' : 'jpg';
      setImagen({
        uri: asset.uri,
        nombre: asset.fileName ?? `imagen.${extension}`,
        bytes: bytes.buffer,
        mime: validacion.mime,
        tamano: bytes.byteLength,
      });
    } catch {
      setImagen(null);
      setError('No pudimos leer la imagen. Elige otra.');
    } finally {
      setLeyendo(false);
    }
  };

  const tomarFoto = async () => {
    let permiso = await ImagePicker.getCameraPermissionsAsync();
    if (!permiso.granted && permiso.canAskAgain) {
      permiso = await ImagePicker.requestCameraPermissionsAsync();
    }
    setPermisoCamara(aEstado(permiso));
    if (!permiso.granted) return;
    try {
      await procesar(await ImagePicker.launchCameraAsync(opcionesPicker));
    } catch {
      setError('No pudimos abrir la cámara. Prueba con la galería.');
    }
  };

  const elegirDeGaleria = async () => {
    try {
      await procesar(await ImagePicker.launchImageLibraryAsync(opcionesPicker));
    } catch {
      setError('No pudimos abrir la galería. Inténtalo de nuevo.');
    }
  };

  const limpiar = () => {
    setImagen(null);
    setError(null);
  };

  return {
    permisoCamara,
    imagen,
    error,
    leyendo,
    tomarFoto,
    elegirDeGaleria,
    abrirAjustes: () => void Linking.openSettings(),
    limpiar,
  };
};
