// Regresión RF-30: en Expo Go (Android) setNotificationChannelAsync rechaza la promesa con un
// NullPointerException; el permiso se debe pedir igual. Las variables de los mocks empiezan por
// "mock" porque jest.mock solo deja usar esas dentro de la fábrica.
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockCanal = jest.fn<() => Promise<null>>();
const mockPedir = jest.fn<() => Promise<unknown>>();

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  Linking: { openSettings: jest.fn() },
}));

jest.mock('expo-notifications', () => ({
  setNotificationChannelAsync: () => mockCanal(),
  requestPermissionsAsync: () => mockPedir(),
  AndroidImportance: { HIGH: 6 },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
}));

// eslint-disable-next-line import/first
import { pedirPermisoNotificaciones } from '@/services/notificaciones';
// eslint-disable-next-line import/first
import { EstadoPermiso } from '@/types/ubicacion';

describe('pedirPermisoNotificaciones (RF-30)', () => {
  beforeEach(() => {
    mockCanal.mockReset();
    mockPedir.mockReset();
  });

  it('pide el permiso aunque crear el canal falle', async () => {
    mockCanal.mockRejectedValue(new Error('NullPointerException'));
    mockPedir.mockResolvedValue({ granted: true, status: 'granted', canAskAgain: true });

    await expect(pedirPermisoNotificaciones()).resolves.toBe(EstadoPermiso.CONCEDIDO);
    expect(mockPedir).toHaveBeenCalledTimes(1);
  });

  it('crea el canal antes de pedir el permiso (Android 13 o superior)', async () => {
    const orden: string[] = [];
    mockCanal.mockImplementation(async () => {
      orden.push('canal');
      return null;
    });
    mockPedir.mockImplementation(async () => {
      orden.push('permiso');
      return { granted: false, status: 'denied', canAskAgain: false };
    });

    await expect(pedirPermisoNotificaciones()).resolves.toBe(EstadoPermiso.BLOQUEADO);
    expect(orden).toEqual(['canal', 'permiso']);
  });
});
