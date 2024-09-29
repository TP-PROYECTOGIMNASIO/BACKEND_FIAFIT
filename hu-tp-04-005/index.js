import pkg from 'pg';
import AWS from 'aws-sdk';

// Configuración de la conexión a PostgreSQL
const pool = new pkg.Pool({
  user: 'fia_fit_user',
  host: 'dpg-crq80452ng1s73e3ueu0-a.oregon-postgres.render.com',
  database: 'fia_fit_db',
  password: 'VKEqqYetj5RXA1Eit0zizGWvoMfw4Opq',
  port: 5432,
  ssl: {
    rejectUnauthorized: false // Solo en desarrollo. En producción, configura esto correctamente.
  }
});

// Inicializar el servicio de Cognito Identity Provider
const cognito = new AWS.CognitoIdentityServiceProvider();

export const handler = async (event) => {
  const client = await pool.connect();
  try {
    if (event.httpMethod === "GET") {
      // Obtener el clientId desde los parámetros de la solicitud (queryStringParameters)
      const { clientId } = event.queryStringParameters;

      if (!clientId) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
          },
          body: JSON.stringify({ message: 'El parámetro clientId es requerido' }),
        };
      }

      // Consulta SQL para obtener los datos del cliente
      const query = `
        SELECT 
          t_clients.phone_number,
          t_clients.names,
          t_locations.address,
          t_memberships.name as membership_name
        FROM 
          t_clients
        JOIN 
          t_client_memberships ON t_clients.client_id = t_client_memberships.client_id  -- Relación corregida usando client_id
        JOIN 
          t_locations ON t_client_memberships.location_id = t_locations.location_id
        JOIN 
          t_memberships ON t_client_memberships.membership_id = t_memberships.membership_id
        WHERE 
          t_clients.client_id = $1  -- Búsqueda por client_id
      `;

      // Ejecutar la consulta
      const result = await client.query(query, [clientId]);

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
          },
          body: JSON.stringify({ message: 'Cliente no encontrado' }),
        };
      }

      // Retornar los datos encontrados
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
        },
        body: JSON.stringify(result.rows[0]),
      };
    }

    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
      },
      body: JSON.stringify({ message: 'Método no permitido' }),
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
      body: JSON.stringify({ message: 'Error interno del servidor', error: error.message }),
    };
  } finally {
    client.release();
  }
};
