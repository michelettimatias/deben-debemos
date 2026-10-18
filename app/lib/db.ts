// lib/db.ts
// NOTA: El proyecto utiliza el cliente de Supabase (@/utils/supabase/server) para consultas a la base de datos.
// Este cliente Postgres directo sólo se activa si se define opcionalmente DATABASE_URL.
import postgres from 'postgres';

const sql = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, {
      ssl: 'require',
      max: 10,
    })
  : null;

export default sql;