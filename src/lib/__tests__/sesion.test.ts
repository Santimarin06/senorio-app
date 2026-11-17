import { describe, expect, it, jest } from '@jest/globals';
import { AxiosError, AxiosHeaders } from 'axios';

import { esFranjaTomada, mensajeDeAuth, mensajeDeReserva } from '@/lib/errores';
import {
  debeRefrescar,
  hayCambiosPerfil,
  normalizarDatosPerfil,
  normalizarTelefono,
  validarDatosPerfil,
  validarInicioSesion,
  validarRegistro,
} from '@/lib/sesion';
import { mapPerfil, mapTokens, traeSesion } from '@/models/sesion.mapper';

// En Jest no hay .env: se simula una app configurada para probar los mensajes del servidor.
jest.mock('@/config/env', () => ({
  env: { supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon' },
  faltaConfiguracion: false,
}));

/** Error de Axios con la respuesta que daría Supabase. */
const errorHttp = (status: number, data: object) =>
  new AxiosError('fallo', 'ERR', undefined, undefined, {
    status,
    statusText: '',
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

describe('validarRegistro (RF-01)', () => {
  const valido = { nombre: 'Ana', telefono: '3001234567', correo: 'ana@correo.com', contrasena: 'secreta1' };

  it('acepta datos válidos, también con +57 y espacios en el celular', () => {
    expect(validarRegistro(valido)).toEqual({});
    expect(validarRegistro({ ...valido, telefono: '+57 300 123 4567' })).toEqual({});
  });

  it('da un mensaje específico por campo', () => {
    expect(validarRegistro({ nombre: ' ', telefono: '', correo: '', contrasena: '' })).toEqual({
      nombre: 'Escribe tu nombre.',
      telefono: 'Escribe tu celular.',
      correo: 'Escribe tu correo.',
      contrasena: 'Escribe una contraseña.',
    });
    expect(validarRegistro({ ...valido, telefono: '300abc4567' }).telefono).toBe('El celular solo lleva números.');
    expect(validarRegistro({ ...valido, telefono: '6012345678' }).telefono).toBe(
      'El celular tiene 10 dígitos y empieza por 3.',
    );
    expect(validarRegistro({ ...valido, correo: 'ana@' }).correo).toContain('no es válido');
    expect(validarRegistro({ ...valido, contrasena: '123' }).contrasena).toContain('al menos 6');
  });

  it('normaliza el celular', () => {
    expect(normalizarTelefono('+57 (300) 123-4567')).toBe('3001234567');
    expect(normalizarTelefono('573001234567')).toBe('3001234567');
  });

  it('valida el inicio de sesión', () => {
    expect(validarInicioSesion({ correo: 'ANA@correo.com ', contrasena: 'x' })).toEqual({});
    expect(validarInicioSesion({ correo: '', contrasena: '' })).toEqual({
      correo: 'Escribe tu correo.',
      contrasena: 'Escribe tu contraseña.',
    });
  });
});

describe('Editar mis datos (RF-15)', () => {
  it('acepta nombre y celular válidos, con indicativo y espacios', () => {
    expect(validarDatosPerfil({ nombre: 'Ana Ruiz', telefono: '+57 310 555 0142' })).toEqual({});
  });

  it('usa los mismos mensajes del registro', () => {
    expect(validarDatosPerfil({ nombre: ' ', telefono: '' })).toEqual({
      nombre: 'Escribe tu nombre.',
      telefono: 'Escribe tu celular.',
    });
    expect(validarDatosPerfil({ nombre: 'A', telefono: '2001234567' })).toEqual({
      nombre: 'El nombre es muy corto.',
      telefono: 'El celular tiene 10 dígitos y empieza por 3.',
    });
    expect(validarDatosPerfil({ nombre: 'Ana', telefono: '300abc' }).telefono).toBe(
      'El celular solo lleva números.',
    );
  });

  it('normaliza antes de guardar', () => {
    expect(normalizarDatosPerfil({ nombre: '  Ana Ruiz ', telefono: '+57 310-555-0142' })).toEqual({
      nombre: 'Ana Ruiz',
      telefono: '3105550142',
    });
  });

  it('sin cambios reales no hay nada que guardar', () => {
    const actual = { nombre: 'Ana Ruiz', telefono: '3105550142' };
    expect(hayCambiosPerfil(actual, { nombre: 'Ana Ruiz ', telefono: '310 555 0142' })).toBe(false);
    expect(hayCambiosPerfil(actual, { nombre: 'Ana María', telefono: '3105550142' })).toBe(true);
    expect(hayCambiosPerfil(actual, { nombre: 'Ana Ruiz', telefono: '3001234567' })).toBe(true);
  });
});

describe('tokens', () => {
  it('renueva un minuto antes de vencer', () => {
    expect(debeRefrescar(1_000_000, 1_000_000 - 120_000)).toBe(false);
    expect(debeRefrescar(1_000_000, 1_000_000 - 60_000)).toBe(true);
    expect(debeRefrescar(1_000_000, 1_000_001)).toBe(true);
  });

  it('mapTokens guarda el vencimiento en milisegundos', () => {
    const respuesta = { access_token: 'a', refresh_token: 'r', expires_in: 3600, user: { id: 'u' } };
    expect(mapTokens(respuesta, 1000)).toEqual({ accessToken: 'a', refreshToken: 'r', expiraEn: 3_601_000 });
    expect(traeSesion(respuesta)).toBe(true);
    expect(traeSesion({ id: 'u', email: 'a@b.co' })).toBe(false);
  });

  it('mapPerfil trata un rol desconocido como cliente', () => {
    expect(
      mapPerfil({
        id: '1',
        nombre: '',
        telefono: null,
        correo: 'a@b.co',
        rol: 'superusuario',
        profesional_id: 'p1',
      }),
    ).toEqual({
      id: '1',
      nombre: 'Cliente',
      rol: 'cliente',
      correo: 'a@b.co',
      telefono: '',
      profesionalId: null,
    });
  });
});

describe('mensajes de error', () => {
  it('traduce los errores de Supabase Auth', () => {
    expect(mensajeDeAuth(errorHttp(400, { error_code: 'invalid_credentials' }))).toBe(
      'El correo o la contraseña no coinciden.',
    );
    expect(mensajeDeAuth(errorHttp(400, { error_code: 'email_not_confirmed' }))).toContain('Confirma tu correo');
    expect(mensajeDeAuth(errorHttp(422, { error_code: 'user_already_exists' }))).toContain('Ya existe');
    // Casos reales de los logs de Supabase al registrar prueba@correo.com.
    expect(mensajeDeAuth(errorHttp(400, { error_code: 'email_address_invalid' }))).toBe(
      'No podemos enviar la confirmación a ese correo. Usa un correo real tuyo.',
    );
    expect(mensajeDeAuth(errorHttp(429, { error_code: 'over_email_send_rate_limit' }))).toContain(
      'límite de correos',
    );
  });

  it('reconoce la franja tomada por la restricción de exclusión (RN-02)', () => {
    const tomada = errorHttp(400, { code: 'P0001', message: 'RN-02: esa franja acaba de ocuparse. Elige otra.' });
    expect(esFranjaTomada(tomada)).toBe(true);
    expect(mensajeDeReserva(tomada)).toBe('Esa franja acaba de ser tomada. Elige otra.');
  });

  it('muestra la regla de la base sin el código', () => {
    const multa = errorHttp(400, { code: 'P0001', message: 'RN-07: hay una multa pendiente. Págala.' });
    expect(esFranjaTomada(multa)).toBe(false);
    expect(mensajeDeReserva(multa)).toBe('Hay una multa pendiente. Págala.');
    expect(mensajeDeReserva(errorHttp(500, {}))).toBe('No pudimos registrar la cita. Inténtalo de nuevo.');
  });
});
