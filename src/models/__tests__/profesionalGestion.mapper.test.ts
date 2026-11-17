import { describe, expect, it } from '@jest/globals';

import { mapCuenta, mapProfesionalGestion, profesionalACuerpo } from '@/models/profesional.mapper';
import type { ProfesionalGestionRespuesta } from '@/types/api';

const respuesta: ProfesionalGestionRespuesta = {
  id: 'p1',
  nombre: 'Mario',
  cargo: null,
  foto_url: ' ',
  activo: false,
  servicios: [
    { id: 's2', nombre: 'Corte', es_adicional: false, activo: true },
    { id: 's1', nombre: 'Barba', es_adicional: false, activo: false },
  ],
  perfiles: { id: 'u1', nombre: 'Mario Gómez', correo: 'mario@correo.co', telefono: null },
};

describe('mapProfesionalGestion', () => {
  it('conserva activo, ordena servicios y trae la cuenta como objeto', () => {
    expect(mapProfesionalGestion(respuesta)).toEqual({
      id: 'p1',
      nombre: 'Mario',
      cargo: 'Profesional',
      cargoGuardado: '',
      foto: null,
      activo: false,
      servicios: [
        { id: 's1', nombre: 'Barba', esAdicional: false, activo: false },
        { id: 's2', nombre: 'Corte', esAdicional: false, activo: true },
      ],
      cuenta: { id: 'u1', nombre: 'Mario Gómez', correo: 'mario@correo.co', telefono: '' },
    });
  });

  it('acepta la cuenta como lista o ausente', () => {
    expect(mapProfesionalGestion({ ...respuesta, perfiles: [] }).cuenta).toBeNull();
    expect(mapProfesionalGestion({ ...respuesta, perfiles: null }).cuenta).toBeNull();
    expect(
      mapProfesionalGestion({
        ...respuesta,
        perfiles: [{ id: 'u2', nombre: '', correo: null, telefono: '3001234567' }],
      }).cuenta,
    ).toEqual({ id: 'u2', nombre: 'Sin nombre', correo: '', telefono: '3001234567' });
  });
});

describe('profesionalACuerpo', () => {
  it('arma los parámetros de guardar_profesional', () => {
    expect(
      profesionalACuerpo(null, {
        nombre: ' Mario ',
        cargo: ' ',
        foto: null,
        servicios: ['s1', 's1', 's2'],
        usuarioId: 'u1',
      }),
    ).toEqual({
      p_id: null,
      p_nombre: 'Mario',
      p_cargo: null,
      p_foto_url: null,
      p_servicios: ['s1', 's2'],
      p_usuario: 'u1',
    });
  });

  it('mapCuenta deja vacíos correo y teléfono que faltan', () => {
    expect(mapCuenta({ id: 'u', nombre: 'Ana', correo: null, telefono: null })).toEqual({
      id: 'u',
      nombre: 'Ana',
      correo: '',
      telefono: '',
    });
  });
});
