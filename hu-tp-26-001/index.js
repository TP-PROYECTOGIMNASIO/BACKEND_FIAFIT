import pkg from 'pg';

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

export const handler = async (event) => {
  const { httpMethod, queryStringParameters } = event;

  if (httpMethod === 'GET') {
    const client_id = queryStringParameters?.client_id;
    const staff_id = queryStringParameters?.staff_id;

    if (!client_id && !staff_id) {
      return {
        statusCode: 400,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
        },
        body: JSON.stringify({ error: 'Se requiere client_id o staff_id' }),
      };
    }

    try {
      // Caso 1: Obtener la lista de alumnos si no se proporciona un client_id
      if (staff_id) {
        const query = `
          SELECT 
            c.client_id,
            CONCAT(c.names, ' ', c.father_last_name, ' ', c.mother_last_name) AS nombres, -- Nombre completo del alumno
            CONCAT(s.names, ' ', s.father_last_name, ' ', s.mother_last_name) AS entrenador, -- Nombre completo del entrenador
            l.name AS sede,
            m.name AS membresia,
            'Sin rango' AS rango
          FROM t_clients c
          LEFT JOIN t_locations l ON c.location_id = l.location_id
          LEFT JOIN t_client_memberships cm ON cm.client_id = c.client_id
          LEFT JOIN t_memberships m ON cm.membership_id = m.membership_id
          LEFT JOIN t_staff s ON c.staff_id = s.staff_id
          WHERE s.staff_id = $1;
        `;

        const res = await pool.query(query, [staff_id]);

        if (res.rows.length === 0) {
          return {
            statusCode: 404,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
            },
            body: JSON.stringify({ error: 'No se encontraron alumnos para el staff_id proporcionado' }),
          };
        }

        // Retornar la lista de alumnos con el nombre del entrenador
        return {
          statusCode: 200,
          headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
          },
          body: JSON.stringify(res.rows),
        };
      }

      // Caso 2: Obtener los detalles del cliente si se proporciona un client_id
      if (client_id) {
        const query = `
          SELECT 
            CONCAT(c.names, ' ', c.father_last_name, ' ', c.mother_last_name) AS nombres, -- Nombre completo del alumno
            g.gender AS genero,
            CONCAT(s.names, ' ', s.father_last_name, ' ', s.mother_last_name) AS entrenador, -- Nombre completo del entrenador
            l.name AS sede,
            m.name AS membresia,
            'Sin rango' AS rango
          FROM t_clients c
          LEFT JOIN t_genders g ON c.gender_id = g.gender_id
          LEFT JOIN t_locations l ON c.location_id = l.location_id
          LEFT JOIN t_client_memberships cm ON cm.client_id = c.client_id
          LEFT JOIN t_memberships m ON cm.membership_id = m.membership_id
          LEFT JOIN t_staff s ON c.staff_id = s.staff_id
          WHERE c.client_id = $1;
        `;

        const res = await pool.query(query, [client_id]);

        if (res.rows.length === 0) {
          return {
            statusCode: 404,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
            },
            body: JSON.stringify({ error: 'No se encontraron detalles para el client_id proporcionado' }),
          };
        }

        // Retornar los detalles del cliente
        return {
          statusCode: 200,
          headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
          },
          body: JSON.stringify(res.rows[0]),
        };
      }

    } catch (err) {
      console.error('Error al obtener los datos:', err);
      return {
        statusCode: 500,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
        },
        body: JSON.stringify({ error: 'Error al obtener los datos', details: err.message }),
      };
    }
  } else {
    return {
      statusCode: 405,
      headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
      },
      body: JSON.stringify({ error: 'Método no permitido' }),
    };
  }
};
