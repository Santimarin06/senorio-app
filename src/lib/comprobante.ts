// Anticipo y comprobante (RF-13, RN-08, RN-09, D-28, D-38). Funciones puras: las pantallas
// solo las llaman. Dinero en pesos COP enteros.
import { COMPROBANTE, FINANZAS } from '@/config/negocio';
import { validarAbono, type Validacion } from '@/lib/finanzas';
import type { Anticipo, Comprobante, TipoAnticipo } from '@/types/entidades';

/** D-28: si la cita vale menos que el abono mínimo, la app no ofrece anticipo. */
export const ofreceAnticipo = (totalCita: number): boolean => totalCita >= FINANZAS.ABONO_MINIMO;

/** Monto del anticipo según lo elegido: el abono se valida con RN-08; el total es el total. */
export function montoAnticipo(tipo: TipoAnticipo, entrada: unknown, totalCita: number): Validacion {
  if (tipo === 'total') {
    if (!ofreceAnticipo(totalCita)) {
      return { ok: false, error: 'Esta cita no admite anticipo.' };
    }
    return { ok: true, valor: totalCita };
  }
  return validarAbono(entrada, totalCita);
}

export type TipoImagen = 'image/jpeg' | 'image/png';

/**
 * Tipo real del archivo por sus primeros bytes, sin fiarse de la extensión ni del nombre:
 * JPG empieza por FF D8 FF y PNG por 89 50 4E 47. Cualquier otro (HEIC, WEBP…) es null.
 */
export function tipoDeImagen(bytes: Uint8Array): TipoImagen | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  return null;
}

const ALFABETO_BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Bytes de la imagen a partir del base64 que entrega expo-image-picker. Se usa en lugar de
 * fetch(asset.uri): en Expo Go, fetch no encuentra el archivo local (su ruta tiene caracteres
 * codificados como %2540) y devuelve el texto "File not found" como si fuera la imagen.
 * Ignora un prefijo "data:...;base64," y los saltos de línea. Devuelve null si no es base64.
 */
export function bytesDeBase64(base64: string): Uint8Array<ArrayBuffer> | null {
  const limpio = base64.replace(/^data:[^,]*,/, '').replace(/[\s=]/g, '');
  if (limpio.length % 4 === 1) return null;
  const bytes = new Uint8Array(Math.floor((limpio.length * 3) / 4));
  let acumulado = 0;
  let bits = 0;
  let j = 0;
  for (let i = 0; i < limpio.length; i++) {
    const valor = ALFABETO_BASE64.indexOf(limpio.charAt(i));
    if (valor === -1) return null;
    acumulado = (acumulado << 6) | valor;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[j++] = (acumulado >> bits) & 0xff;
    }
  }
  return bytes;
}

/** "1,2 MB" o "350 KB", con coma decimal y sin toFixed. */
export function formatoTamano(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    const decimas = Math.round(mb * 10);
    const resto = decimas % 10;
    return `${Math.floor(decimas / 10)}${resto ? `,${resto}` : ''} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export type ValidacionArchivo = { ok: true; mime: TipoImagen } | { ok: false; error: string };

/** RF-13: solo JPG o PNG de hasta 5 MB. Se valida antes de subir nada. */
export function validarArchivoComprobante(bytes: Uint8Array): ValidacionArchivo {
  if (bytes.length === 0) return { ok: false, error: 'La imagen está vacía. Elige otra.' };
  const mime = tipoDeImagen(bytes);
  if (!mime) {
    return { ok: false, error: 'Solo se aceptan imágenes JPG o PNG. Elige otra imagen.' };
  }
  if (bytes.length > COMPROBANTE.tamanoMaximoBytes) {
    const pesa = formatoTamano(bytes.length);
    const maximo = formatoTamano(COMPROBANTE.tamanoMaximoBytes);
    // Si al redondear se ve igual al máximo, decir "pesa 5 MB; el máximo es 5 MB" confunde.
    return {
      ok: false,
      error:
        pesa === maximo
          ? `La imagen supera los ${maximo}. Elige otra o recórtala.`
          : `La imagen pesa ${pesa}; el máximo es ${maximo}.`,
    };
  }
  return { ok: true, mime };
}

/** Ruta en el bucket: la primera carpeta es el cliente, como exige la política de Storage. */
export const rutaComprobante = (
  clienteId: string,
  citaId: string,
  ahoraMs: number,
  mime: TipoImagen,
): string => `${clienteId}/${citaId}-${ahoraMs}.${mime === 'image/png' ? 'png' : 'jpg'}`;

/**
 * Estado del anticipo (D-15). La base permite un solo comprobante no rechazado por cita, así
 * que si existe ese manda; si no, se muestra el rechazado más reciente; sin ninguno, sin anticipo.
 */
export function estadoAnticipo(comprobantes: readonly Comprobante[]): Anticipo {
  const vigente = comprobantes.find((c) => c.estado !== 'rechazado');
  if (vigente) return { estado: vigente.estado, comprobante: vigente };

  const rechazado = [...comprobantes].sort(
    (a, b) => Date.parse(b.subidoEn) - Date.parse(a.subidoEn),
  )[0];
  return rechazado
    ? { estado: 'rechazado', comprobante: rechazado }
    : { estado: 'sin_anticipo', comprobante: null };
}

/** Se puede enviar un comprobante nuevo cuando no hay ninguno vigente (pendiente o aprobado). */
export const puedeEnviarComprobante = (anticipo: Anticipo): boolean =>
  anticipo.estado === 'sin_anticipo' || anticipo.estado === 'rechazado';
