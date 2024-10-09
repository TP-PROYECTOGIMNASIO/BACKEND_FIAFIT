import pkg from 'pg';

// RESPONSABLE: Paolo Diaz 
// HISTORIA DE USUARIO: 17 - VISUALIZAR ARTICULOS EN LINEA
// DESCRIPCION: Obtieene los datos mediante una API
// PATH: /api/productos/hu-tp-17
// METHODS: GET

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
    // Consigue el id y el nombre del tipo de producto
    const productTypeName = event.queryStringParameters?.product_type_name;
    const productName = event.queryStringParameters?.product_name;

    let query;
    let values = [];
    let index = 1;  // Variable para controlar los índices de los valores en la consulta SQL

    // Construcción dinámica de la consulta
    if (productTypeName && productName) {
      // Filtrar por product_type_name y product_name
      query = `
        SELECT p.*, p.product_name AS name, pt.product_type_name AS category
        FROM t_products p
        JOIN t_product_types pt ON p.product_type_id = pt.product_type_id
        WHERE LOWER(pt.product_type_name) LIKE $${index++} 
          AND LOWER(p.product_name) LIKE $${index++} 
        ORDER BY p.product_name ASC`;
      values.push(`%${productTypeName.toLowerCase()}%`);
      values.push(`%${productName.toLowerCase()}%`);
    } else if (productTypeName) {
      // Filtrar solo por product_type_name
      query = `
        SELECT p.*, p.product_name AS name, pt.product_type_name AS category
        FROM t_products p
        JOIN t_product_types pt ON p.product_type_id = pt.product_type_id
        WHERE LOWER(pt.product_type_name) LIKE $${index++}
        ORDER BY p.product_name ASC`;
      values.push(`%${productTypeName.toLowerCase()}%`);
    } else if (productName) {
      // Filtrar solo por nombre del producto
      query = `
        SELECT p.*, p.product_name AS name, pt.product_type_name AS category
        FROM t_products p
        JOIN t_product_types pt ON p.product_type_id = pt.product_type_id
        WHERE LOWER(p.product_name) LIKE $${index++}
        ORDER BY p.product_name ASC`;
      values.push(`%${productName.toLowerCase()}%`);
    } else {
      // Si no se proporciona ningún filtro, devolver todos los productos
      query = `
        SELECT p.*, p.product_name AS name, pt.product_type_name AS category
        FROM t_products p
        JOIN t_product_types pt ON p.product_type_id = pt.product_type_id
        ORDER BY p.product_name ASC`;
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
        body: JSON.stringify({ message: 'Producto no encontrado' }),
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
