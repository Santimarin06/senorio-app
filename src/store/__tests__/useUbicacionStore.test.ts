// RF-12, lineamientos §5: al salir del mapa no puede quedar una suscripción del GPS viva, ni
// siquiera si se sale mientras la suscripción todavía se está pidiendo. Las variables de los
// mocks empiezan por "mock" porque jest.mock solo deja usar esas dentro de la fábrica.
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

interface SuscripcionFalsa {
  remove: jest.Mock<() => void>;
}

const mockSuscripciones: SuscripcionFalsa[] = [];
let mockEntregar: (() => void)[] = [];

jest.mock('@/services/ubicacion/ubicacion', () => ({
  obtenerUbicacionActual: jest.fn(),
  // La suscripción llega cuando la prueba llama a entregar(), como la promesa real.
  seguirUbicacion: () =>
    new Promise((resolve) => {
      const s: SuscripcionFalsa = { remove: jest.fn<() => void>() };
      mockSuscripciones.push(s);
      mockEntregar.push(() => resolve(s));
    }),
}));

// eslint-disable-next-line import/first
import { useUbicacionStore } from '@/store/useUbicacionStore';

const estado = () => useUbicacionStore.getState();

describe('useUbicacionStore: seguimiento del GPS', () => {
  beforeEach(() => {
    mockSuscripciones.length = 0;
    mockEntregar = [];
    useUbicacionStore.setState({ suscripcion: null, generacion: 0 });
  });

  it('guarda la suscripción y la libera al detener', async () => {
    const inicio = estado().iniciarSeguimiento();
    mockEntregar[0]?.();
    await expect(inicio).resolves.toBe(true);
    expect(estado().suscripcion).toBe(mockSuscripciones[0]);

    estado().detenerSeguimiento();
    expect(mockSuscripciones[0]?.remove).toHaveBeenCalledTimes(1);
    expect(estado().suscripcion).toBeNull();
  });

  it('si se sale del mapa mientras llega la suscripción, la libera y no la guarda', async () => {
    const inicio = estado().iniciarSeguimiento();
    estado().detenerSeguimiento(); // useFocusEffect al salir, antes de que llegue
    mockEntregar[0]?.();
    await expect(inicio).resolves.toBe(false);
    expect(mockSuscripciones[0]?.remove).toHaveBeenCalledTimes(1);
    expect(estado().suscripcion).toBeNull();
  });

  it('dos inicios seguidos dejan una sola suscripción viva', async () => {
    const primero = estado().iniciarSeguimiento();
    const segundo = estado().iniciarSeguimiento();
    mockEntregar[0]?.();
    mockEntregar[1]?.();
    await expect(primero).resolves.toBe(false);
    await expect(segundo).resolves.toBe(true);
    expect(mockSuscripciones[0]?.remove).toHaveBeenCalledTimes(1);
    expect(mockSuscripciones[1]?.remove).not.toHaveBeenCalled();
    expect(estado().suscripcion).toBe(mockSuscripciones[1]);
  });
});
