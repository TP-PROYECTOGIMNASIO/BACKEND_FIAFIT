import https from 'https';
import axios from 'axios';
import pkg from 'pg';
import sgMail from '@sendgrid/mail';


// RESPONSABLE: Nadin Asin
// HISTORIA DE USUARIO: 21 - ACTUALIZAR SUSCRIPCIÓN COMO ALUMNO
// DESCRIPCION: 
// PATH: /api/membresias/hu-tp-21
// METHODS: GET, POST


const { Client } = pkg;

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PATCH',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: null,
    };
  }

  const client = new Client({
    host: 'dpg-crq80452ng1s73e3ueu0-a.oregon-postgres.render.com',
    port: 5432,
    user: 'fia_fit_user',
    password: 'VKEqqYetj5RXA1Eit0zizGWvoMfw4Opq',
    database: 'fia_fit_db',
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();

    if (event.httpMethod === 'GET' && !event.queryStringParameters?.client_id) {
      // Obtener todas las membresías disponibles
      const membershipsQuery = `
        SELECT membership_id, name, price, description, active, created_at, updated_at
        FROM t_memberships
        WHERE active = TRUE;
      `;
    
      const membershipsResult = await client.query(membershipsQuery);
      const availableMemberships = membershipsResult.rows;
    
      if (availableMemberships.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'No se encontraron membresías disponibles' }),
        };
      }
    
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(availableMemberships),
      };
    }
    
    if (event.httpMethod === 'GET') {
      const { client_id } = event.queryStringParameters || {};

      if (!client_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Falta el parámetro client_id' }),
        };
      }

      const query = `
        SELECT client_membership_id, membership_id, membership_start_date, payment_frequency_months, created_at, updated_at, membership_end_date
        FROM t_client_memberships
        WHERE client_id = $1
        ORDER BY membership_start_date DESC;
      `;

      const result = await client.query(query, [client_id]);
      const memberships = result.rows;

      if (memberships.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'No se encontraron suscripciones para este cliente' }),
        };
      }

      // Mapeamos las suscripciones para agregar el estado
      const membershipsWithStatus = memberships.map((membership) => {
        const endDate = membership.membership_end_date;
        const isActive = !endDate || new Date(endDate) >= new Date(); // Activo si no tiene fecha de fin o es futura
        const status = isActive ? "activo" : "cancelado";

        return {
          ...membership,
          status: status,
        };
      });

      // Comprobar si el cliente tiene alguna suscripción activa
      const hasActiveSubscription = membershipsWithStatus.some(m => m.status === "activo");

      if (!hasActiveSubscription) {
        membershipsWithStatus.forEach(m => m.status = "inactivo");
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(membershipsWithStatus),
      };
    }

    if (event.httpMethod === 'POST') {
      const { client_id, membership_id, payment_frequency_months, email, token } = JSON.parse(event.body);

      if (!client_id || !membership_id || !payment_frequency_months || !email || !token) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Faltan parámetros en la solicitud' }),
        };
      }

      // Verificar si el cliente tiene una suscripción activa
      const activeSubscriptionQuery = `
        SELECT client_membership_id, membership_start_date, payment_frequency_months, membership_end_date
        FROM t_client_memberships
        WHERE client_id = $1
        AND (membership_end_date IS NULL OR membership_end_date >= CURRENT_DATE)
        ORDER BY membership_start_date DESC
        LIMIT 1;
      `;

      const activeSubscriptionResult = await client.query(activeSubscriptionQuery, [client_id]);
      const activeSubscription = activeSubscriptionResult.rows[0];

      if (activeSubscription) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'No puedes actualizar tu membresía mientras se encuentre vigente' }),
        };
      }

      // Obtener precio de la membresía y calcular el monto total
      const membershipPriceQuery = `
        SELECT price 
        FROM t_memberships 
        WHERE membership_id = $1;
      `;
      const priceResult = await client.query(membershipPriceQuery, [membership_id]);
      const membership = priceResult.rows[0];

      if (!membership) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Membresía no encontrada' }),
        };
      }

      // Calcular el monto en centavos
      const amountInCents = Math.round(membership.price * payment_frequency_months * 100);

      // Realizar la solicitud de pago a Culqi
      const postData = JSON.stringify({
        amount: amountInCents,
        currency_code: 'PEN',
        email: email,
        source_id: token,
      });

      const options = {
        hostname: 'api.culqi.com',
        path: '/v2/charges',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer sk_test_0df6274e07cec4fb',  // Reemplaza con tu llave privada de Culqi
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      try {
        const paymentResponse = await new Promise((resolve, reject) => {
          const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
              resolve({
                statusCode: res.statusCode,
                data: JSON.parse(data),
              });
            });
          });
          req.on('error', reject);
          req.write(postData);
          req.end();
        });

        if (paymentResponse.statusCode !== 201) {
          return {
            statusCode: paymentResponse.statusCode,
            headers,
            body: JSON.stringify({
              success: false,
              message: paymentResponse.data.user_message || 'Error en la solicitud de pago',
            }),
          };
        }

        // Calcular fecha de fin de la membresía
        const membershipEndDate = new Date();
        membershipEndDate.setMonth(membershipEndDate.getMonth() + payment_frequency_months);

        // Insertar nueva suscripción
        const insertQuery = `
          INSERT INTO t_client_memberships (client_id, membership_id, membership_start_date, payment_frequency_months, membership_end_date, created_at, updated_at)
          VALUES ($1, $2, NOW(), $3, $4, NOW(), NOW())
          RETURNING *;
        `;
        const insertValues = [client_id, membership_id, payment_frequency_months, membershipEndDate];
        const insertResult = await client.query(insertQuery, insertValues);
        const newMembership = insertResult.rows[0];

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ message: 'Pago y suscripción completados exitosamente', membership: newMembership }),
        };
      } catch (error) {
        console.error('Error en el proceso de pago:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: 'Error en el proceso de pago' }),
        };
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Método no permitido' }),
    };

  } catch (error) {
    console.error('Error al realizar la consulta:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Error interno del servidor' }),
    };
  } finally {
    await client.end();
  }
}
