import pkg from 'pg';

// Configuración de la conexión
const pool = new pkg.Pool({
  user: 'db_gym_render_user',
  host: 'dpg-cr5568ij1k6c73934m10-a.oregon-postgres.render.com',
  database: 'db_gym_render',
  password: 'LusVdIcmARRFj7nY76BbOj9MzQ2Y33I5',
  port: 5432,
  ssl: {
    rejectUnauthorized: false // Solo en desarrollo. En producción, configura esto correctamente.
  }
});



export const handler = async (event) => {
  try {
    // consigue el id
    const productTypeId = event.queryStringParameters?.product_type_id;

    let query;
    let values = [];

    if (productTypeId) {
      // Si se proporciona un product_type_id, filtrar por ese producto
      query = 'SELECT * FROM t_product_types WHERE product_type_id = $1';
      values = [productTypeId];
    } else {
      // Si no se proporciona un product_type_id, devolver todos los productos
      query = 'SELECT * FROM t_product_types ORDER BY product_name ASC';
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
