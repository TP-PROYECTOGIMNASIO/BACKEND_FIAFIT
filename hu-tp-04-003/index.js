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
      // Obtener las membresías y sedes
      const membershipsQuery = 'SELECT * FROM public.t_memberships';
      const locationsQuery = 'SELECT * FROM public.t_locations';

      const membershipsResult = await client.query(membershipsQuery);
      const locationsResult = await client.query(locationsQuery);

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
        },
        body: JSON.stringify({
          memberships: membershipsResult.rows,
          locations: locationsResult.rows,
        }),
      };
    }

    if (event.httpMethod === "POST") {
      const { clientId, membershipId, locationId, paymentFrequencyMonths } = JSON.parse(event.body);

      // Validar paymentFrequencyMonths
      if (paymentFrequencyMonths < 1 || paymentFrequencyMonths > 12) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
          },
          body: JSON.stringify({ message: 'payment_frequency_months debe estar entre 1 y 12' }),
        };
      }

      const currentDate = new Date().toISOString();
      const queryInsertMembership = `
        INSERT INTO public.t_client_memberships 
        (client_id, membership_id, membership_start_date, payment_frequency_months, location_id, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      const valuesInsertMembership = [
        clientId,
        membershipId,
        currentDate, // Aquí se establece la fecha de inicio
        paymentFrequencyMonths, // Usar el valor proporcionado por el usuario
        locationId,
        currentDate,
        currentDate
      ];

      await client.query(queryInsertMembership, valuesInsertMembership);

      return {
        statusCode: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
        },
        body: JSON.stringify({ message: 'Membresía y sede asignadas exitosamente' }),
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
      body: JSON.stringify({ message: 'Error interno del servidor' }),
    };
  } finally {
    client.release();
  }
};
