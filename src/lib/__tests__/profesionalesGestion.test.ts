import { describe, expect, it } from '@jest/globals';

import {
  coincideCuenta,
  coincideProfesional,
  entradaDeProfesional,
  resumenProfesional,
  rutaFotoProfesional,
  validarProfesional,
  type EntradaProfesional,
} from '@/lib/gestion';
import type { ProfesionalGestion } from '@/types/entidades';

// Servicios principales activos del local; 'a1' es un adicional (silla relajante).
const principales = new Set(['s1', 's2']);

const base: EntradaProfesional = {
  nombre: '  Mario ',
  cargo: ' Barbero ',
  servicios: ['s1', 's1', 'a1'],
  usuarioId: 'u1',
};

const ficha: ProfesionalGestion = {
  id: 'p1',
  nombre: 'Mario',
  cargo: 'Barbero',
  cargoGuardado: 'Barbero',
  foto: null,
  activo: true,
  servicios: [
    { id: 's1', nombre: 'Corte clásico', esAdicional: false, activo: true },
    { id: 's3', nombre: 'Tinte', esAdicional: false, activo: false },
  ],
  cuenta: { id: 'u1', nombre: 'Mario Gómez', correo: 'mario@correo.co', telefono: '3001234567' },
};

describe('validarProfesional', () => {
  it('recorta, quita servicios repetidos y vincula la cuenta de una ficha nueva', () => {
    expect(validarProfesional(base, principales, true, 'https://x/foto.jpg')).toEqual({
      ok: true,
      valor: {
        nombre: 'Mario',
        cargo: 'Barbero',
        foto: 'https://x/foto.jpg',
        servicios: ['s1', 'a1'],
        usuarioId: 'u1',
      },
    });
  });

  it('al editar una ficha que ya tiene cuenta no manda cuenta', () => {
    const r = validarProfesional(base, principales, false, null);
    expect(r.ok && r.valor.usuarioId).toBeNull();
  });

  it('exige nombre, un servicio principal activo y la cuenta', () => {
    expect(
      validarProfesional({ nombre: ' ', cargo: '', servicios: ['a1', 's3'], usuarioId: null }, principales, true, null),
    ).toEqual({
      ok: false,
      errores: {
        nombre: 'El nombre es obligatorio.',
        servicios: 'Elige al menos un servicio principal que preste.',
        cuenta: 'Elige la cuenta con la que la persona se registró.',
      },
    });
  });

  it('limita el cargo a 40 caracteres', () => {
    const r = validarProfesional({ ...base, cargo: 'x'.repeat(41) }, principales, true, null);
    expect(r).toEqual({ ok: false, errores: { cargo: 'El cargo admite hasta 40 caracteres.' } });
  });
});

describe('textos y búsqueda de la pestaña Profesionales', () => {
  it('entradaDeProfesional conserva los servicios inactivos y no propone cuenta', () => {
    expect(entradaDeProfesional(ficha)).toEqual({
      nombre: 'Mario',
      cargo: 'Barbero',
      servicios: ['s1', 's3'],
      usuarioId: null,
    });
    expect(entradaDeProfesional(null)).toEqual({ nombre: '', cargo: '', servicios: [], usuarioId: null });
  });

  it('el resumen muestra solo servicios activos y avisa si falta la cuenta', () => {
    expect(resumenProfesional(ficha)).toBe('Barbero · Corte clásico');
    expect(resumenProfesional({ ...ficha, servicios: [], cuenta: null })).toBe(
      'Barbero · Sin servicios activos · Sin cuenta',
    );
  });

  it('busca sin tildes por nombre, servicio o correo', () => {
    expect(coincideProfesional(ficha, 'clasico')).toBe(true);
    expect(coincideProfesional(ficha, 'MARIO@')).toBe(true);
    expect(coincideProfesional(ficha, 'camilo')).toBe(false);
    expect(coincideCuenta(ficha.cuenta!, '300123')).toBe(true);
    expect(coincideCuenta(ficha.cuenta!, 'gomez')).toBe(true);
  });

  it('la foto va a la carpeta profesionales', () => {
    expect(rutaFotoProfesional('p1', 9, 'image/png')).toBe('profesionales/p1-9.png');
    expect(rutaFotoProfesional(null, 9, 'image/jpeg')).toBe('profesionales/nuevo-9.jpg');
  });
});
