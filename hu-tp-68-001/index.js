import pkg from 'pg';

const { Pool } = pkg;

// Configuración de la conexión a PostgreSQL
const con = new Pool({
  user: 'fia_fit_user',
  host: 'dpg-crq80452ng1s73e3ueu0-a.oregon-postgres.render.com',
  database: 'fia_fit_db',
  password: 'VKEqqYetj5RXA1Eit0zizGWvoMfw4Opq',
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
          if (path.endsWith('/viewdetails')) {
            
            
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
            const sql = "SELECT P.product_id, P.created_at, t.name, l.name as sede, p.stock_quantity, p.price FROM t_products AS P INNER JOIN t_product_types AS t on t.product_type_id = p.product_type_id INNER JOIN t_locations AS l on l.location_id = p.location_id WHERE p.location_id IS NOT NULL AND p.product_id = $1";
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
        } else {
          // Si no se especifica ID, devolver las diferente busquedas
          if (path.endsWith('/viewdetails')) {
            // Me trae todas las sedes de la tabla t_locations
            const sql = "SELECT product_id,name,price, created_at FROM t_products WHERE location_id IS NOT NULL";
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
