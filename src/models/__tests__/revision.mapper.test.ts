import { describe, expect, it } from '@jest/globals';

import {
  mapComprobanteRevision,
  mapDevolucionPendiente,
  mapMultaRevision,
  sinNulos,
} from '@/models/revision.mapper';
import type { CitaRevisionRespuesta, ComprobanteRevisionRespuesta } from '@/types/api';

const cita: CitaRevisionRespuesta = {
  id: 'c1',
  inicio: '2026-11-06T20:00:00+00:00',
  estado: 'cancelada_tarde',
  total: 65000,
  profesionales: { nombre: 'Mario' },
};

const comprobante: ComprobanteRevisionRespuesta = {
  id: 'k1',
  tipo: 'abono',
  monto: 20000,
  metodo: 'nequi',
  subido_en: '2026-11-05T15:00:00+00:00',
  archivo_path: 'u1/c1-1.jpg',
  cliente: { nombre: '  Santiago Ruiz ', telefono: '3001234567' },
  citas: cita,
};

describe('mapComprobanteRevision (RF-28)', () => {
  it('trae cliente, cita y medio', () => {
    expect(mapComprobanteRevision(comprobante)).toEqual({
      id: 'k1',
      tipo: 'abono',
      monto: 20000,
      metodo: 'nequi',
      subidoEn: comprobante.subido_en,
      archivoPath: 'u1/c1-1.jpg',
      cliente: 'Santiago Ruiz',
      cita: { id: 'c1', inicio: cita.inicio, estado: 'cancelada_tarde', total: 65000, profesional: 'Mario' },
      anticipoAprobadoCita: 0,
    });
  });

  it('suma lo ya aprobado de la cita, como el anticipo trasladado (D-45)', () => {
    const conTraslado = mapComprobanteRevision({
      ...comprobante,
      citas: { ...cita, comprobantes: [{ monto: 5000, estado: 'aprobado' }, { monto: 5000, estado: 'pendiente' }] },
    });
    expect(conTraslado?.anticipoAprobadoCita).toBe(5000);
  });

  it('sin cita se descarta y un medio desconocido queda en null', () => {
    expect(mapComprobanteRevision({ ...comprobante, citas: null })).toBeNull();
    expect(mapComprobanteRevision({ ...comprobante, metodo: 'efectivo' })?.metodo).toBeNull();
  });
});

describe('mapMultaRevision (RF-25)', () => {
  it('un estado desconocido se trata como pendiente y sin cliente dice "Cliente"', () => {
    const m = mapMultaRevision({
      id: 'm1',
      motivo: 'cancelo_tarde',
      monto: 10000,
      estado: 'otro',
      resuelta_en: null,
      cliente: null,
      citas: cita,
    });
    expect(m?.estado).toBe('pendiente');
    expect(m?.cliente).toBe('Cliente');
    expect(m?.motivo).toBe('cancelo_tarde');
  });
});

describe('mapDevolucionPendiente (RF-28)', () => {
  it('el monto del comprobante aprobado es el anticipo', () => {
    expect(mapDevolucionPendiente(comprobante)).toMatchObject({
      comprobanteId: 'k1',
      anticipoAprobado: 20000,
      devolucionElegidaEn: null,
      telefono: '3001234567',
    });
  });

  it('sinNulos quita las filas descartadas', () => {
    expect(sinNulos([1, null, 2])).toEqual([1, 2]);
  });
});
