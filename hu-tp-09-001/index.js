import pkg from 'pg';
import fetch from 'node-fetch';

// RESPONSABLE: Nadin Asin
// HISTORIA DE USUARIO: 09 - Realizar check-in como empleado
// DESCRIPCION: Permite a los empleados registrar su check-in al enviar su ubicación actual (latitud y longitud). La API valida si el empleado está en su ubicación de trabajo registrada y, si es correcto, registra la hora de entrada.
// PATH: /api/check-in-empleados/hu-tp-09
// METHODS: POST


const { Client } = pkg;

export async function handler(event) {

  // Configuración de CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PATCH',
  };
  // Respuesta para solicitudes preflight de CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: null,
    };
  }

  // Configuración del cliente PostgreSQL
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

    if (event.httpMethod === 'POST') {
      const { employee_id, latitude, longitude } = JSON.parse(event.body);

      // Obtener la localización del empleado desde t_staff
      const staffQuery = `SELECT location_id FROM t_staff WHERE staff_id = $1`;
      const staffResult = await client.query(staffQuery, [employee_id]);
      const staffLocation = staffResult.rows[0];

      if (!staffLocation) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: 'Empleado no encontrado' }),
        };
      }

      const location_id = staffLocation.location_id;
      
      // Obtener la latitud y longitud de la ubicación del empleado desde t_locations
    const locationQuery = `SELECT lat, long FROM t_locations WHERE location_id = $1`;
    const locationResult = await client.query(locationQuery, [location_id]);
    const workLocation = locationResult.rows[0];

    if (!workLocation) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Ubicación del empleado no encontrada' }),
      };
    }

       // Calcular la distancia entre la ubicación actual y la ubicación de trabajo
    const distance = getDistanceFromLatLonInKm(
      latitude, longitude, workLocation.lat, workLocation.long
    );

      // Validar si la distancia está dentro de un rango aceptable para el check-in (ejemplo: 15 metros)
      if (distance <= 0.015) {
        // Registrar el check-in en la tabla t_staff_attendances
        const checkInQuery = `
          INSERT INTO t_staff_attendances (staff_id, date, entry_time, created_at, updated_at)
          VALUES ($1, CURRENT_DATE, NOW(), NOW(), NOW())
          RETURNING *;
        `;
        const checkInValues = [employee_id];
        const result = await client.query(checkInQuery, checkInValues);

        return {
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
          },
          body: JSON.stringify({
            message: 'Check-in realizado exitosamente.',
            attendance: result.rows[0],
          }),
        };
      } else {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
          },
          body: JSON.stringify({
            message: 'El check-in no fue realizado. No te encuentras en el lugar de trabajo.',
          }),
        };
      }
    }

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error al procesar la solicitud de check-in.',
        error: err.message,
      }),
    };
  } finally {
    await client.end();
  }
}

// Función para calcular la distancia entre dos coordenadas geográficas
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distancia en km
  return d;
}

// Función auxiliar para convertir grados a radianes
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
