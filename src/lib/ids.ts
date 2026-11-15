// Supabase usa uuid como id. Un id con otro formato no existe (y Postgres respondería 400).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const esUuid = (valor: string): boolean => UUID.test(valor);
