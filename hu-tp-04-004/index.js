import pkg from 'pg';

// Configuración de la conexión a PostgreSQL
const pool = new pkg.Pool({
    user: 'fia_fit_user',
  host: 'dpg-crq80452ng1s73e3ueu0-a.oregon-postgres.render.com',
  database: 'fia_fit_db',
  password: 'VKEqqYetj5RXA1Eit0zizGWvoMfw4Opq',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

// Extrae datos del cuerpo de la solicitud
export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
      },
      body: JSON.stringify({ message: 'Usa POST' }),
    };
  }

  const { clientId, membershipId, locationId, membershipStartDate } = JSON.parse(event.body);
  const client = await pool.connect();
  
  try {
    // Obtener el ID del cliente usando user_id
    const queryGetClientId = `SELECT client_id FROM public.t_clients WHERE user_id = $1`;
    const values1 = [clientId];
    const result1 = await client.query(queryGetClientId, values1);
    const client_id = result1.rows[0]?.client_id;
    
    if (!client_id) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
        },
        body: JSON.stringify({ message: 'Client ID not found' }),
      };
    }

    // Insertar en la tabla t_client_memberships
    const insertMembership = `
      INSERT INTO t_client_memberships (client_id, membership_id, membership_start_date, payment_frequency_months, location_id, created_at, updated_at) 
      VALUES ($1, $2, $3, 0, $4, NOW(), NOW())`;
    
    await client.query(insertMembership, [client_id, membershipId, membershipStartDate, locationId]);

    // Actualizar membership_start_date en t_client_memberships
    const updateMembershipDate = `
      UPDATE t_client_memberships 
      SET membership_start_date = $1 
      WHERE client_id = $2 AND membership_id = $3`;
    
    await client.query(updateMembershipDate, [membershipStartDate, client_id, membershipId]);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
      },
      body: JSON.stringify({ message: "Membership assigned successfully" }),
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
      },
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  } finally {
    client.release();
  }
};
