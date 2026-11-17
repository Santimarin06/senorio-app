import { describe, expect, it } from '@jest/globals';

import { enlaceWhatsApp, mensajeCancelacion, mensajeReserva } from '@/lib/whatsapp';

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

describe('Aviso de cancelación (RF-07, RF-09)', () => {
  const base = {
    cliente: 'Ana',
    codigo: 'SB-1A2B3C',
    profesional: 'Mario',
    servicios: ['Corte clásico o moderno'],
    fechaHora: 'viernes 20 de noviembre, 3:00 p. m.',
    total: 30000,
  };

  it('a tiempo con anticipo: lleva los datos de la cita y la devolución', () => {
    const m = mensajeCancelacion({ ...base, tardia: false, devolucion: 18000, multaPendiente: 0 });
    expect(m).toContain('Cancelé mi cita SB-1A2B3C');
    expect(m).toContain('Cliente: Ana');
    expect(m).toContain('Profesional: Mario');
    expect(m).toContain('Servicios: Corte clásico o moderno');
    expect(m).toContain('Fecha y hora: viernes 20 de noviembre, 3:00 p. m.');
    expect(m).toContain('Valor: $30.000');
    expect(m).toContain('4 horas o más');
    expect(m).toContain('Devolución del anticipo: $18.000.');
    expect(m).not.toContain('Multa pendiente');
  });

  it('tardía con anticipo: menciona la multa y no deja multa pendiente', () => {
    const m = mensajeCancelacion({ ...base, tardia: true, devolucion: 8000, multaPendiente: 0 });
    expect(m).toContain('menos de 4 horas (multa de $10.000)');
    expect(m).toContain('Devolución del anticipo: $8.000.');
    expect(m).not.toContain('Multa pendiente');
  });

  it('tardía sin anticipo: sin devolución y con multa pendiente', () => {
    const m = mensajeCancelacion({ ...base, tardia: true, devolucion: 0, multaPendiente: 10000 });
    expect(m).not.toContain('Devolución');
    expect(m).toContain('Multa pendiente: $10.000.');
  });

  it('el enlace conserva tildes y saltos de línea', () => {
    const m = mensajeCancelacion({ ...base, tardia: false, devolucion: 0, multaPendiente: 0 });
    expect(decodeURIComponent(enlaceWhatsApp(m).split('text=')[1] ?? '')).toBe(m);
  });
});
