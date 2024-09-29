import pkg from 'pg';
import AWS from 'aws-sdk';
import { parse } from 'lambda-multipart-parser';

const { Client } = pkg;
const s3 = new AWS.S3();

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
    
    
    
    // Conectar a PostgreSQL
    await client.connect();

    // Solo permitir método POST
    if (event.httpMethod === 'POST') {
      // Parsear datos del formulario multipart
      const formData = await parse(event);
      const { product_type_id, product_name, description, price } = formData;
      const file = formData.files[0];

      // Subida del archivo a S3 si se proporciona uno
      let imageUrl = null;
      if (file) {
        const s3Params = {
          Bucket: 'hu-tp-87-001', // Nombre del bucket S3
          Key: `products/${file.filename}`, // Nombre del archivo en S3
          Body: file.content, // Contenido del archivo
          ContentType: file.contentType, // Tipo de contenido del archivo
        };

        const uploadResult = await s3.upload(s3Params).promise();
        imageUrl = uploadResult.Location;
      }

      // Consulta SQL para insertar producto en la tabla products
      const query = `
        INSERT INTO t_products (product_type_id, product_name, description, price, image_url, active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`;
      const values = [product_type_id, product_name, description, price, imageUrl, true];

      // Ejecutar consulta
      const result = await client.query(query, values);

      // Respuesta exitosa
      return {
        statusCode: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PATCH',
        },
        body: JSON.stringify({
          message: 'Producto registrado exitosamente.',
          product: result.rows[0],
        }),
      };
    } else if (event.httpMethod === 'PATCH') {
      // Eliminar un producto

      const { product_id, active } = JSON.parse(event.body); // Obtenemos el ID del producto y el nuevo estado 'active'

    // Consulta SQL para actualizar el atributo 'active'
    const updateQuery = `
        UPDATE t_products
        SET active = $1, updated_at = NOW()
        WHERE product_id = $2
        RETURNING *`;
    const values = [active, product_id];

      // Ejecutar consulta
    const result = await client.query(updateQuery, values);

    if (result.rowCount === 0) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Producto no encontrado' }),
        };
    }

    // Respuesta exitosa
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PATCH',
        },
        body: JSON.stringify({
            message: 'Producto actualizado con éxito.',
            product: result.rows[0],
        }),
    };
      
    } else if (event.httpMethod === 'GET') {
      // Obtener parámetros de consulta si hay alguno (para el filtro)
      const { product_type_id, show_inactive } = event.queryStringParameters || {};

      let query;
      let values = [];

       if (product_type_id && show_inactive !== undefined) {
    // Obtener artículos filtrados por tipo y estado (activos o inactivos)
    query = 'SELECT * FROM t_products WHERE product_type_id = $1 AND active = $2';
    values = [product_type_id, show_inactive === 'true'];
  } else if (product_type_id) {
    // Obtener artículos filtrados solo por tipo
    query = 'SELECT * FROM t_products WHERE product_type_id = $1';
    values = [product_type_id];
  } else if (show_inactive !== undefined) {
    // Obtener artículos filtrados solo por estado (activos o inactivos)
    query = 'SELECT * FROM t_products WHERE active = $1';
    values = [show_inactive === 'true'];
  } else {
    // Obtener todos los artículos
    query = 'SELECT * FROM t_products';
  }

      const result = await client.query(query, values);

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PATCH',
        },
        body: JSON.stringify({
          message: 'Lista de productos obtenida exitosamente.',
          products: result.rows,
        }),
      };

    } else {
      return {
        statusCode: 405,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PATCH',
        },
        body: JSON.stringify({ error: 'Método no permitido' }),
      };
    }
  } catch (err) {
    console.error('Error:', err.message);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PATCH',
      },
      body: JSON.stringify({ error: `Error interno del servidor: ${err.message}` }),
    };
  } finally {
    try {
      await client.end();
    } catch (endErr) {
      console.error('Error al cerrar la conexión:', endErr.message);
    }
  }
}
