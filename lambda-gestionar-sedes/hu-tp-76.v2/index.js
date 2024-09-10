// Importa el módulo 'pg' para conectarse a la base de datos PostgreSQL
import pkg from 'pg';
// Importa el SDK de AWS para interactuar con los servicios de AWS
import AWS from 'aws-sdk';
// Importa la biblioteca 'lambda-multipart-parser' para manejar datos de formularios multipartes
import { parse } from 'lambda-multipart-parser';

// Desestructura el cliente de PostgreSQL desde el módulo importado
const { Client } = pkg;
// Crea una instancia de S3 para manejar operaciones con Amazon S3
const s3 = new AWS.S3();

export async function handler(event) {
  // Configura el cliente de PostgreSQL con los parámetros de conexión
  const client = new Client({
    host: 'dpg-cr5568ij1k6c73934m10-a.oregon-postgres.render.com',
    port: 5432,
    user: 'db_gym_render_user',
    password: 'LusVdIcmARRFj7nY76BbOj9MzQ2Y33I5',
    database: 'db_gym_render',
    ssl: {
      rejectUnauthorized: false, // Asegura que el cliente pueda conectar aunque el certificado no sea verificado
    },
  });

  try {
    // Conecta al cliente de PostgreSQL
    await client.connect();

    // Verifica si el método HTTP de la solicitud es POST
    if (event.httpMethod === 'POST') {
      // Analiza los datos del formulario multipart
      const formData = await parse(event);
      // Extrae los campos necesarios del formulario
      const { name, address } = formData;
      // Extrae el archivo del formulario
      const file = formData.files[0];

      // Verifica que los campos 'name' y 'address' estén presentes
      if (!name || !address) {
        return {
          statusCode: 400, // Código de estado HTTP para solicitud incorrecta
          headers: {
            'Access-Control-Allow-Origin': '*',  // Permite solicitudes desde cualquier origen
            'Access-Control-Allow-Headers': 'Content-Type',  // Permite ciertos encabezados
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permite ciertos métodos HTTP
          },
          body: JSON.stringify({ error: 'Los campos "name" y "address" son requeridos.' }),
        };
      }

      // Verifica si se ha subido un archivo
      let imageUrl = null;
      if (file) {
        // Imprime el tipo de contenido del archivo para fines de depuración
        console.log(`Tipo de contenido del archivo: ${file.contentType}`);

        // Define los parámetros para subir el archivo a S3
        const s3Params = {
          Bucket: 'hu-tp-76-001', // Nombre del bucket S3
          Key: `${file.filename}`, // Nombre del archivo en S3
          Body: file.content, // Contenido del archivo
          ContentType: file.contentType, // Tipo de contenido del archivo
          //ACL: 'public-read', // Permite que el archivo sea leído públicamente
        };

        // Sube el archivo a S3 y obtiene la URL del archivo subido
        const uploadResult = await s3.upload(s3Params).promise();
        imageUrl = uploadResult.Location;
      }

      // Define la consulta SQL para insertar un nuevo registro en la base de datos
      const query = `
        INSERT INTO t_locations (name, address, image_url, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`;
      // Define los valores a insertar en la base de datos
      const values = [name, address, imageUrl, true]; // 'true' para el campo 'status'

      // Ejecuta la consulta en la base de datos
      const result = await client.query(query, values);

      // Devuelve una respuesta de éxito con el registro creado
      return {
        statusCode: 201, // Código de estado HTTP para creación exitosa
        headers: {
          'Access-Control-Allow-Origin': '*',  // Permite solicitudes desde cualquier origen
          'Access-Control-Allow-Headers': 'Content-Type',  // Permite ciertos encabezados
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permite ciertos métodos HTTP
        },
        body: JSON.stringify({
          message: 'Sede registrada exitosamente.',
          location: result.rows[0],
        }),
      };
    } else {
      // Devuelve un error si el método HTTP no es POST
      return {
        statusCode: 405, // Código de estado HTTP para método no permitido
        headers: {
          'Access-Control-Allow-Origin': '*',  // Permite solicitudes desde cualquier origen
          'Access-Control-Allow-Headers': 'Content-Type',  // Permite ciertos encabezados
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permite ciertos métodos HTTP
        },
        body: JSON.stringify({ error: 'Método no permitido' }),
      };
    }
  } catch (err) {
    // Maneja errores durante la operación
    console.error('Error al realizar la operación:', err.message);
    return {
      statusCode: 500, // Código de estado HTTP para error interno del servidor
      headers: {
        'Access-Control-Allow-Origin': '*',  // Permite solicitudes desde cualquier origen
        'Access-Control-Allow-Headers': 'Content-Type',  // Permite ciertos encabezados
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permite ciertos métodos HTTP
      },
      body: JSON.stringify({ error: `Error interno del servidor: ${err.message}` }),
    };
  } finally {
    try {
      // Intenta cerrar la conexión a la base de datos
      await client.end();
    } catch (endErr) {
      // Maneja errores al cerrar la conexión
      console.error('Error al cerrar la conexión:', endErr.message);
    }
  }
}
