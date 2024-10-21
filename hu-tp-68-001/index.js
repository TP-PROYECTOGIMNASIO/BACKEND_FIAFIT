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
        const id_sede = queryParams?.id_sede; // ID del producto pasado como parámetro de consulta
        const search = queryParams?.search;  // Parámetro de búsqueda opcional

if (id_sede) {
  // Validar que la ruta acabe en '/viewdetails'
  if (path.endsWith('/viewdetails')) {
    
    // Validar que id_sede sea un número
    if (!id_sede || isNaN(Number(id_sede))) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
          'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
        },
        body: JSON.stringify({ message: "El ID de la sede es requerido y debe ser un número válido." }),
      };
    }

    // Parámetros opcionales: typeproduct y product_name
    const { typeproduct, product_name } = event.queryStringParameters || {};
    
    // Construir la consulta SQL con filtros opcionales
    let sql = `
      SELECT 
        P.product_id, 
        P.product_name AS producto, 
        P.image_url AS imagen, 
        t.product_type_name AS TipoProducto, 
        ps.quantity AS stock, 
        l.name AS sede, 
        P.price, 
        P.created_at 
      FROM 
        t_products AS P 
      INNER JOIN 
        t_product_types AS t ON t.product_type_id = p.product_type_id 
      INNER JOIN 
        t_product_stock AS ps ON ps.product_id = p.product_id 
      INNER JOIN 
        t_locations AS l ON l.location_id = ps.location_id 
      WHERE 
        ps.location_id = $1
    `;

    const queryParams = [id_sede];  // Inicializa con id_sede como obligatorio

    // Agregar filtro por typeproduct si está presente
    if (typeproduct) {
      sql += " AND t.product_type_id = $2";
      queryParams.push(typeproduct);
    }

    // Agregar filtro por product_name si está presente (con búsqueda ILIKE)
    if (product_name) {
      sql += ` AND P.product_name ILIKE $${queryParams.length + 1}`;
      queryParams.push(`%${product_name}%`);
    }

    // Ejecutar la consulta con los parámetros construidos
    const result = await query(sql, queryParams);

    // Si devuelve 0 filas, devolver un mensaje
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

    // Devolver el resultado
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
        'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
      },
      body: JSON.stringify(result.rows),  // Retorna el resultado
    };
  }
}
 else {
          // Si no se especifica ID, devolver las diferente busquedas
          if (path.endsWith('/viewdetails')) {
            // Me trae todas las sedes de la tabla t_locations
            const sql = "SELECT P.product_id,P.product_name As producto,P.image_url as imagen, t.product_type_name AS TipoProducto, ps.quantity as stock, l.name as sede, p.price, P.created_at FROM t_products AS P INNER JOIN t_product_types AS t on t.product_type_id = p.product_type_id INNER JOIN t_product_stock AS ps on ps.product_id= p.product_id INNER JOIN t_locations AS l on l.location_id = ps.location_id WHERE ps.location_id IS NOT NULL";
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
