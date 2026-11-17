import { describe, expect, it } from '@jest/globals';

import { intervaloDeReintento, REINTENTO_SIN_CONEXION_MS } from '@/lib/reconexion';

describe('intervaloDeReintento', () => {
  it('reintenta una consulta que falló', () => {
    expect(intervaloDeReintento('error')).toBe(REINTENTO_SIN_CONEXION_MS);
  });

  it('no repite una consulta que cargó o que está cargando', () => {
    expect(intervaloDeReintento('success')).toBe(false);
    expect(intervaloDeReintento('pending')).toBe(false);
  });
});
