import { describe, expect, it } from '@jest/globals';

import { enlaceWhatsApp, mensajeReserva } from '@/lib/whatsapp';

describe('WhatsApp (RF-07)', () => {
  const mensaje = mensajeReserva({
    cliente: 'Ana',
    profesional: 'Mario',
    servicios: ['Corte clásico o moderno', 'Silla relajante'],
    fechaHora: 'martes 17 de noviembre, 10:00 a. m.',
    total: 40000,
  });

  it('lleva cliente, profesional, servicios, fecha, hora y valor', () => {
    expect(mensaje).toContain('Cliente: Ana');
    expect(mensaje).toContain('Profesional: Mario');
    expect(mensaje).toContain('Servicios: Corte clásico o moderno, Silla relajante');
    expect(mensaje).toContain('Fecha y hora: martes 17 de noviembre, 10:00 a. m.');
    expect(mensaje).toContain('Valor: $40.000');
  });

  it('arma el enlace wa.me al número de la barbería con el texto codificado', () => {
    const enlace = enlaceWhatsApp(mensaje);
    expect(enlace.startsWith('https://wa.me/573189773741?text=')).toBe(true);
    expect(decodeURIComponent(enlace.split('text=')[1] ?? '')).toBe(mensaje);
  });
});
