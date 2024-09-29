import pkg from 'pg';
import AWS from 'aws-sdk';
import { AdminUpdateUserAttributesCommand } from '@aws-sdk/client-cognito-identity-provider';

// Inicializar el servicio de Cognito Identity Provider
const cognito = new AWS.CognitoIdentityServiceProvider();

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

// Extrae datos del cuerpo de la solicitud
export const handler = async (event) => {
  if (event.httpMethod !== "PATCH") {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
        'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
      },
      body: JSON.stringify({ message: 'Usa PATCH' }),
    };
  }

  const userId = event.queryStringParameters?.userId;
  const client = await pool.connect();
  
  try {
    // Obtener el nombre de usuario
    const queryGetUser = `SELECT "user" FROM t_users WHERE user_id = $1`;
    const values1 = [userId];
    const result1 = await client.query(queryGetUser, values1);
    const username = result1.rows[0]?.user;
    
    if (!username) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
        },
        body: JSON.stringify({ message: 'User not found' }),
      };
    }

    // Obtener el clientId
    const queryGetIdClient = `SELECT client_id FROM public.t_clients WHERE user_id = $1`;
    const result2 = await client.query(queryGetIdClient, values1);
    const clientId = result2.rows[0]?.client_id;
    
    if (!clientId) {
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

    // Actualizar rol en la base de datos
    const rolId = await findIdByRolName("Cliente Regular");
    const updateRoleUser = `UPDATE t_clients SET rol_id = $1 WHERE client_id = $2`;
    await client.query(updateRoleUser, [rolId, clientId]);

    // Actualizar atributos del usuario en Cognito
    const params = {
      UserPoolId: 'us-east-2_kbbQNOdqg', // Reemplaza con tu User Pool ID
      Username: username,
      UserAttributes: [
        {
          Name: 'custom:role',
          Value: 'cliente',
        },
      ],
    };

    await cognito.adminUpdateUserAttributes(params).promise();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
      },
      body: JSON.stringify({ message: "User role updated successfully" }),
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

async function findIdByRolName(rolName) {
  // Implementa la lógica para encontrar el ID del rol por nombre
  // Esta función debe devolver un ID válido basado en el nombre del rol
  return 6; // Valor de ejemplo
}
