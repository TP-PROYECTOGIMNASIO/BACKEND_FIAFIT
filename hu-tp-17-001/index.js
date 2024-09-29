import pkg from 'pg';

// Configuración de la conexión
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
  try {
    // Consigue el id y el nombre del producto
    const productTypeId = event.queryStringParameters?.product_type_id;
    const productName = event.queryStringParameters?.product_name;

    let query;
    let values = [];
    let index = 1;  // Variable para controlar los índices de los valores en la consulta SQL

    // Construcción dinámica de la consulta
    if (productTypeId && productName) {
      // Filtrar por product_type_id y product_name
      query = 'SELECT * FROM t_products WHERE product_type_id = $1 AND LOWER(product_name) LIKE $2 ORDER BY product_name ASC';
      values.push(productTypeId);
      values.push(`%${productName.toLowerCase()}%`);
    } else if (productTypeId) {
      // Filtrar solo por product_type_id
      query = 'SELECT * FROM t_products WHERE product_type_id = $1 ORDER BY product_name ASC';
      values.push(productTypeId);
    } else if (productName) {
      // Filtrar solo por nombre del producto
      query = 'SELECT * FROM t_products WHERE LOWER(product_name) LIKE $1 ORDER BY product_name ASC';
      values.push(`%${productName.toLowerCase()}%`);
    } else {
      // Si no se proporciona ningún filtro, devolver todos los productos
      query = 'SELECT * FROM t_products ORDER BY product_name ASC';
    }

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
          'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
        },
        body: JSON.stringify({ message: 'Tipo de producto no encontrado' }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
        'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
      },
      body: JSON.stringify(result.rows),
    };
  } catch (err) {
    console.error('Error en la operación', err);

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
        'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
      },
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
