import pkg from 'pg';

const { Pool } = pkg;

// Configuración de la conexión a PostgreSQL
const con = new Pool({
  user: 'db_gym_render_user',
  host: 'dpg-cr5568ij1k6c73934m10-a.oregon-postgres.render.com',
  database: 'db_gym_render',
  password: 'LusVdIcmARRFj7nY76BbOj9MzQ2Y33I5',
  port: 5432,
  ssl: {
    rejectUnauthorized: false // Solo en desarrollo. En producción, configura esto correctamente.
  }
});

// Handler de AWS Lambda
export const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false; // Evita que Lambda espere a que el event loop esté vacío antes de terminar

  // Función para ejecutar consultas SQL
  const query = (sql, values) => new Promise((resolve, reject) => {
    con.query(sql, values, (err, res) => {
      if (err) {
        return reject(err);
      }
      resolve(res);
    });
  });

  try {
    const path = event.path; // Ruta solicitada
    const queryParams = event.queryStringParameters; // Parámetros de la consulta

    // Detectar el método HTTP
    switch (event.httpMethod) {
      case 'GET': {
        const id_producto = queryParams?.id_producto; // ID del producto pasado como parámetro de consulta
        const search = queryParams?.search;  // Parámetro de búsqueda opcional

        if (id_producto) {
            // Validar que la ruta acabe en findById
          if (path.endsWith('/findById')) {
            // Validar que id_producto sea un número
            if (!id_producto || isNaN(Number(id_producto))) {
              return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
                body: JSON.stringify({ message: "El ID del producto es requerido y debe ser un número válido." }),
              };
            }
            // Buscar producto por ID
            const sql = "SELECT * FROM t_products WHERE id_product = $1";
            const result = await query(sql, [id_producto]);

            // Si devuelve 0 filas acabar y mostrar un mensaje
            if (result.rowCount === 0) {
              return {
                statusCode: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
                body: JSON.stringify({ message: 'Producto no encontrado.' }),
              };
            }

            return {
              statusCode: 200,
              headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
              body: JSON.stringify(result.rows[0]), // Retorna el primer (y único) resultado
            };
          }
        } else if (search) {
            // Validar que la ruta acabe en findproduct
          if (path.endsWith('/findproduct')) {
            // Validar que search esté presente
            if (!search) {
              return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
                body: JSON.stringify({ message: "Los caracteres son requeridos" }),
              };
            }
            // Buscar productos con location_id nulo y nombre que coincida con la búsqueda
            const sql = "SELECT * FROM t_products WHERE location_id IS NULL AND name_product ILIKE $1";
            const result = await query(sql, [`%${search}%`]);

            // Si devuelve 0 filas acabar y mostrar un mensaje
            if (result.rowCount === 0) {
              return {
                statusCode: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
                body: JSON.stringify({ message: 'No se encontraron productos que coincidan con la búsqueda.' }),
              };
            }

            return {
              statusCode: 200,
              headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
              body: JSON.stringify(result.rows), // Retorna todos los productos que coincidan
            };
          }
        } else {
          // Si no se especifica ID, devolver las diferente busquedas
          if (path.endsWith('/locations')) {
            // Me trae todas las sedes de la tabla t_locations
            const sql = "SELECT location_id, c_name FROM t_locations";
            const results = await query(sql);
            return {
              statusCode: 200,
              headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
              body: JSON.stringify(results.rows),// Retorna todas sedes que coincidan
            };
          } else if (path.endsWith('/withoutlocations')) {
            // Me trae todas los productos que no tengan asignado una sede
            const sql = "SELECT * FROM t_products WHERE location_id IS NULL AND state = 1";
            const results = await query(sql);
            return {
              statusCode: 200,
              headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
              body: JSON.stringify(results.rows),// Retorna todos los productos sin sede que coincidan
            };
          } else if (path.endsWith('/typeproduct')) {
            // Me retorna todos los tipos de productos que tenemos
            const sql = "SELECT * FROM t_type_product where state = 1";
            const results = await query(sql);
            return {
              statusCode: 200,
              headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
              body: JSON.stringify(results.rows), // Retorna todos los tipos de productos
            };
          } else {
            return {
              statusCode: 404,
              headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
              body: JSON.stringify({ message: "Ruta no encontrada." }),
            };
          }
        }
        break;
      }
      case 'PUT': {
        const id_product = queryParams?.id_product; // ID del producto pasado como parámetro de consulta
        
        if (id_product) {
            // Validar que la ruta acabe en asgnlocation
          if (path.endsWith('/asgnlocation')) {
            // Obtener nueva_sede del cuerpo de la solicitud JSON
            const body = JSON.parse(event.body);
            const nueva_sede = body.location_id;

            // Validar que id_producto sea un número
            if (!id_product || isNaN(Number(id_product))) {
              return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
                body: JSON.stringify({ message: "El ID del producto es requerido y debe ser un número válido." }),
              };
            }
            // Validas que este enviando la id sede
            if (!nueva_sede) {
              return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
                body: JSON.stringify({ message: "La nueva sede es requerida." }),
              };
            }

            // Actualizar la sede del producto
            const sql = "UPDATE t_products SET location_id = $1, created_at = NOW() AT TIME ZONE 'America/Lima' WHERE id_product = $2 RETURNING *";
            const result = await query(sql, [nueva_sede, id_product]);

            // Si devuelve 0 filas acabar y mostrar un mensaje
            if (result.rowCount === 0) {
              return {
                statusCode: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
                body: JSON.stringify({ message: 'Producto no encontrado.' }),
              };
            }

            return {
              statusCode: 200,
              headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
              body: JSON.stringify({ message: 'Se actualizó la sede del producto correctamente.',
                                    body: result.rows}),
            };
          }
        }
        break;
      }
      default: {
        return {
          statusCode: 405,
          headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
          body: JSON.stringify({ message: 'Método no permitido.' }),
        };
      }
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
      body: JSON.stringify({ message: 'Error: ' + err.message }),
    };
  }
};
