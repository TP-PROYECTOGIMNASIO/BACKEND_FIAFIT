import pkg from 'pg';

const { Pool } = pkg;

// Configuración de la conexión a PostgreSQL
const con = new Pool({
  user: 'db_gym_render_user', // Usuario de la base de datos
  host: 'dpg-cr5568ij1k6c73934m10-a.oregon-postgres.render.com', // Host de la base de datos
  database: 'db_gym_render', // Nombre de la base de datos
  password: 'LusVdIcmARRFj7nY76BbOj9MzQ2Y33I5', // Contraseña de la base de datos
  port: 5432, // Puerto de conexión a PostgreSQL
  ssl: {
    rejectUnauthorized: false // Solo en desarrollo para evitar errores de certificado. En producción se debe configurar correctamente.
  }
});

// Handler de AWS Lambda
export const handler = async (event, context) => {
  // Evita que Lambda espere a que el event loop esté vacío antes de terminar la ejecución
  context.callbackWaitsForEmptyEventLoop = false;

  // Función para ejecutar consultas SQL
  const query = (sql, values) => new Promise((resolve, reject) => {
    con.query(sql, values, (err, res) => {
      if (err) {
        return reject(err); // Rechazar la promesa si hay un error en la consulta
      }
      resolve(res); // Resolver la promesa con los resultados de la consulta
    });
  });

  try {
    const path = event.path; // Ruta solicitada en el evento Lambda
    const queryParams = event.queryStringParameters; // Parámetros de consulta del evento

    // Detectar el método HTTP
    switch (event.httpMethod) {
      case 'GET': {
        const staff_id = queryParams?.staff_id; // ID de staff pasado como parámetro de consulta
        const body_id = queryParams?.body_id;  // Parámetro de búsqueda opcional (ID de body metrics)
        const client_id = queryParams?.client_id; // ID de cliente pasado como parámetro de consulta

        // Si `staff_id` está presente y la ruta termina en '/alumno'
        if (staff_id) {
          if (path.endsWith('/alumno')) {

            // Validar que el ID sea un número
            if (!staff_id || isNaN(Number(staff_id))) {
              return {
                statusCode: 400,
                headers: {
                  'Access-Control-Allow-Origin': '*', // Permitir solicitudes desde cualquier origen
                  'Access-Control-Allow-Headers': 'Content-Type', // Permitir ciertos encabezados
                  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
                body: JSON.stringify({ message: "El ID del producto es requerido y debe ser un número válido." }),
              };
            }

            // Consulta para obtener alumnos asignados al entrenador con `staff_id`
            const sql = `
              SELECT c.client_id idusuario, c.names as alumno, s.names as entrenador, 
                     l.name as sede, m.name as membership 
              FROM t_clients as c 
              INNER JOIN t_staff as s ON s.staff_id = c.staff_id 
              INNER JOIN t_locations as l ON l.location_id = c.location_id 
              INNER JOIN t_memberships as m ON m.membership_id = c.membership_id 
              WHERE s.staff_id = $1`;
            const result = await query(sql, [staff_id]);

            // Verificar si no se encontraron registros
            if (result.rowCount === 0) {
              return {
                statusCode: 404,
                headers: {
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Headers': 'Content-Type',
                  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({ message: 'Alumnos no asignados.' }),
              };
            }

            // Retornar los resultados de la consulta
            return {
              statusCode: 200,
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
              },
              body: JSON.stringify(result.rows), // Respuesta con las filas encontradas
            };

          } else {
            // Si la ruta no termina en '/alumno'
            return {
              statusCode: 404,
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
              },
              body: JSON.stringify({ message: "Ruta no encontrada." }),
            };
          }
        } else if (client_id) {
          // Si `client_id` está presente y la ruta termina en '/detailsClient'
          if (path.endsWith('/detailsClient')) {

            // Validar que el ID de cliente sea un número
            if (!client_id || isNaN(Number(client_id))) {
              return {
                statusCode: 400,
                headers: {
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Headers': 'Content-Type',
                  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({ message: "El ID del cliente es requerido y debe ser un número válido." }),
              };
            }

            // Consulta para obtener los detalles del cliente por `client_id`
            const sql = `
              SELECT c.client_id idusuario, c.names as nombre, c.father_last_name, g.gender as genero, 
                     s.names as entrenador, l.name as sede, m.name as membership 
              FROM t_clients as c 
              INNER JOIN t_staff as s ON s.staff_id = c.staff_id 
              INNER JOIN t_locations as l ON l.location_id = c.location_id  
              INNER JOIN t_memberships as m ON m.membership_id = c.membership_id 
              INNER JOIN t_genders as g ON g.gender_id = c.gender_id 
              WHERE c.client_id = $1`;
            const result = await query(sql, [client_id]);

            // Verificar si no se encontraron registros
            if (result.rowCount === 0) {
              return {
                statusCode: 404,
                headers: {
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Headers': 'Content-Type',
                  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({ message: 'Sin data' }),
              };
            }

            // Retornar el primer resultado encontrado
            return {
              statusCode: 200,
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
              },
              body: JSON.stringify(result.rows[0]), // Solo retorna la primera fila
            };

          } else {
            return {
              statusCode: 404,
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
              },
              body: JSON.stringify({ message: "Ruta no encontrada." }),
            };
          }
        } else {
          // Si no se especifica `staff_id` o `client_id`, se verifica `body_id` para la ruta '/bodymetric'
          if (path.endsWith('/bodymetric')) {

            // Validar que el ID de body metrics sea un número
            if (!body_id || isNaN(Number(body_id))) {
              return {
                statusCode: 400,
                headers: {
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Headers': 'Content-Type',
                  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({ message: "El ID es requerido y debe ser un número válido." }),
              };
            }

            // Consulta para obtener body metrics por `client_id`
            const sql = `
              SELECT b.client_id as idusuario, b.height as altura, b.weight as peso, 
                     b.right_bicep_cm as bicepderecho, b.left_bicep_cm as bicepizquierdo, 
                     b.right_thigh as musloderecho, b.left_thigh as musloizquierdo, 
                     b.waist as cintura, b.hips as cadera, b.created_at as generado 
              FROM t_clients as c 
              INNER JOIN t_body_metrics AS b ON b.client_id = c.client_id 
              WHERE c.client_id = $1`;
            const results = await query(sql, [body_id]);

            // Verificar si no se encontraron registros
            if (results.rowCount === 0) {
              return {
                statusCode: 404,
                headers: {
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Headers': 'Content-Type',
                  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({ message: 'Sin Body Metrics' }),
              };
            }

            // Retornar los resultados de body metrics
            return {
              statusCode: 200,
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
              },
              body: JSON.stringify(results.rows), // Respuesta con las filas encontradas
            };
          } else {
            return {
              statusCode: 404,
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
              },
              body: JSON.stringify({ message: "Ruta no encontrada." }),
            };
          }
        }
      }
      default:
        // Si se utiliza un método HTTP no soportado
        return {
          statusCode: 405, // Método no permitido
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
          },
          body: JSON.stringify({ message: 'Método HTTP no soportado.' }),
        };
    }
  } catch (err) {
    console.error(err); // Loguear el error en la consola para depuración

    // Retornar error 500 en caso de un fallo del servidor
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
      },
      body: JSON.stringify({ message: 'Error en el servidor.' }),
    };
  }
};
