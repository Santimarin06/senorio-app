import { describe, expect, it } from '@jest/globals';

import { codigoComprobante } from '@/lib/codigoCita';
import {
  bytesDeBase64,
  estadoAnticipo,
  formatoTamano,
  montoAnticipo,
  ofreceAnticipo,
  puedeEnviarComprobante,
  rutaComprobante,
  tipoDeImagen,
  validarArchivoComprobante,
} from '@/lib/comprobante';
import { mensajeComprobante } from '@/lib/whatsapp';
import type { Comprobante } from '@/types/entidades';

const JPG = [0xff, 0xd8, 0xff, 0xe0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a];
const bytes = (cabecera: number[], largo = cabecera.length): Uint8Array => {
  const b = new Uint8Array(largo);
  b.set(cabecera);
  return b;
};

describe('ofreceAnticipo (D-28)', () => {
  it('solo con un total de $10.000 o más', () => {
    expect(ofreceAnticipo(9_999)).toBe(false);
    expect(ofreceAnticipo(10_000)).toBe(true);
  });
});

describe('montoAnticipo (RN-08)', () => {
  it('el abono usa validarAbono con sus mensajes', () => {
    expect(montoAnticipo('abono', '', 65_000)).toEqual({ ok: false, error: 'Ingresa un valor.' });
    expect(montoAnticipo('abono', 'abc', 65_000).ok).toBe(false);
    expect(montoAnticipo('abono', '-5', 65_000)).toEqual({
      ok: false,
      error: 'El valor no puede ser negativo.',
    });
    expect(montoAnticipo('abono', '5.000', 65_000)).toEqual({
      ok: false,
      error: 'El abono mínimo es $10.000.',
    });
    expect(montoAnticipo('abono', '70.000', 65_000).ok).toBe(false);
    expect(montoAnticipo('abono', '20.000', 65_000)).toEqual({ ok: true, valor: 20_000 });
  });

  it('el pago total es el total, sin importar lo escrito', () => {
    expect(montoAnticipo('total', '', 65_000)).toEqual({ ok: true, valor: 65_000 });
    expect(montoAnticipo('total', '', 8_000).ok).toBe(false);
  });
});

describe('archivo del comprobante', () => {
  it('reconoce JPG y PNG por sus primeros bytes', () => {
    expect(tipoDeImagen(bytes(JPG))).toBe('image/jpeg');
    expect(tipoDeImagen(bytes(PNG))).toBe('image/png');
    expect(tipoDeImagen(bytes([0x00, 0x00, 0x00, 0x18, 0x66, 0x74]))).toBeNull(); // HEIC
    expect(tipoDeImagen(new Uint8Array())).toBeNull();
  });

  it('acepta hasta 5 MB y rechaza lo demás con un mensaje claro', () => {
    const cinco = 5 * 1024 * 1024;
    expect(validarArchivoComprobante(bytes(JPG, cinco))).toEqual({ ok: true, mime: 'image/jpeg' });
    expect(validarArchivoComprobante(bytes(PNG, cinco + 1))).toEqual({
      ok: false,
      error: 'La imagen supera los 5 MB. Elige otra o recórtala.',
    });
    expect(validarArchivoComprobante(bytes(PNG, Math.round(6.2 * 1024 * 1024)))).toMatchObject({
      error: 'La imagen pesa 6,2 MB; el máximo es 5 MB.',
    });
    expect(validarArchivoComprobante(bytes([0x47, 0x49, 0x46]))).toMatchObject({ ok: false });
    expect(validarArchivoComprobante(new Uint8Array())).toMatchObject({ ok: false });
  });

  it('formatea el tamaño en MB o KB', () => {
    expect(formatoTamano(1.2 * 1024 * 1024)).toBe('1,2 MB');
    expect(formatoTamano(350 * 1024)).toBe('350 KB');
    expect(formatoTamano(10)).toBe('1 KB');
  });

  it('la ruta empieza por la carpeta del cliente', () => {
    expect(rutaComprobante('cli', 'cita', 123, 'image/png')).toBe('cli/cita-123.png');
    expect(rutaComprobante('cli', 'cita', 123, 'image/jpeg')).toBe('cli/cita-123.jpg');
  });
});

describe('estadoAnticipo (D-15)', () => {
  const comprobante = (
    estado: Comprobante['estado'],
    subidoEn: string,
    id: string = estado,
  ): Comprobante => ({
    id,
    tipo: 'abono',
    monto: 20_000,
    estado,
    notaRechazo: estado === 'rechazado' ? 'Ilegible' : null,
    archivoPath: 'cli/a.jpg',
    metodo: 'nequi',
    subidoEn,
  });

  it('sin comprobantes: sin anticipo', () => {
    const a = estadoAnticipo([]);
    expect(a).toEqual({ estado: 'sin_anticipo', comprobante: null });
    expect(puedeEnviarComprobante(a)).toBe(true);
  });

  it('el vigente manda sobre los rechazados', () => {
    const pendiente = comprobante('pendiente', '2026-11-10T10:00:00Z');
    const a = estadoAnticipo([comprobante('rechazado', '2026-11-11T10:00:00Z'), pendiente]);
    expect(a).toEqual({ estado: 'pendiente', comprobante: pendiente });
    expect(puedeEnviarComprobante(a)).toBe(false);
    expect(estadoAnticipo([comprobante('aprobado', '2026-11-10T10:00:00Z')]).estado).toBe(
      'aprobado',
    );
  });

  it('solo rechazados: muestra el más reciente y deja enviar otro', () => {
    const a = estadoAnticipo([
      comprobante('rechazado', '2026-11-10T10:00:00Z', 'viejo'),
      comprobante('rechazado', '2026-11-12T10:00:00Z', 'nuevo'),
    ]);
    expect(a.estado).toBe('rechazado');
    expect(a.comprobante?.id).toBe('nuevo');
    expect(puedeEnviarComprobante(a)).toBe(true);
  });
});

describe('referencia y aviso por WhatsApp', () => {
  it('código CP- con la regla de D-35', () => {
    expect(codigoComprobante('3f9a1c2b-0000-4000-8000-000000000000')).toBe('CP-3F9A1C');
  });

  it('el mensaje nombra cita, comprobante, monto y aclara que la imagen se adjunta', () => {
    const m = mensajeComprobante({
      codigoCita: 'SB-AAAAAA',
      codigoComprobante: 'CP-BBBBBB',
      tipo: 'abono',
      monto: 20_000,
      medio: 'Nequi',
    });
    expect(m).toContain('CP-BBBBBB');
    expect(m).toContain('SB-AAAAAA');
    expect(m).toContain('Abono: $20.000');
    expect(m).toContain('Medio: Nequi');
    expect(m).toContain('Adjunto la imagen');
    const sinMedio = mensajeComprobante({
      codigoCita: 'SB-AAAAAA',
      codigoComprobante: 'CP-BBBBBB',
      tipo: 'total',
      monto: 65_000,
      medio: null,
    });
    expect(sinMedio).toContain('Pago total: $65.000');
    expect(sinMedio).not.toContain('Medio');
  });
});

describe('bytesDeBase64', () => {
  it('decodifica lo que entrega el picker, sin depender de fetch', () => {
    // FF D8 FF E0 = cabecera JPG; 89 50 4E 47 0D 0A 1A 0A = cabecera PNG.
    expect(Array.from(bytesDeBase64('/9j/4A==') ?? [])).toEqual([0xff, 0xd8, 0xff, 0xe0]);
    expect(tipoDeImagen(bytesDeBase64('iVBORw0KGgo=') ?? new Uint8Array())).toBe('image/png');
    expect(tipoDeImagen(bytesDeBase64('/9j/4AAQSkZJRg==') ?? new Uint8Array())).toBe('image/jpeg');
  });

  it('acepta prefijo data: y saltos de línea, y mide los bytes reales', () => {
    expect(bytesDeBase64('data:image/png;base64,iVBO\nRw0KGgo=')?.length).toBe(8);
    expect(bytesDeBase64('TWFu')).toEqual(new Uint8Array([77, 97, 110]));
    expect(bytesDeBase64('')?.length).toBe(0);
  });

  it('rechaza lo que no es base64', () => {
    expect(bytesDeBase64('no es base64!')).toBeNull();
    expect(bytesDeBase64('A')).toBeNull();
  });

  it('el texto de un 404 ("File not found") no pasa como imagen', () => {
    // Lo que entregaba fetch(asset.uri) en Expo Go: la validación lo rechaza, como debe.
    const texto = new Uint8Array(Array.from('File not found', (c) => c.charCodeAt(0)));
    expect(validarArchivoComprobante(texto)).toMatchObject({ ok: false });
  });
});
