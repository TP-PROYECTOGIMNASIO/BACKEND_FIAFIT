import pkg from 'pg';
import AWS from 'aws-sdk';
import { parse } from 'lambda-multipart-parser';

// Destructura el cliente de PostgreSQL y crea una instancia de S3
const { Client } = pkg;
const s3 = new AWS.S3();

export async function handler(event) {
  // Configura el cliente de PostgreSQL con los detalles de conexión
  const client = new Client({
    host: 'dpg-crq80452ng1s73e3ueu0-a.oregon-postgres.render.com', // Nuevo host
    port: 5432,
    user: 'fia_fit_user', // Nuevo usuario
    password: 'VKEqqYetj5RXA1Eit0zizGWvoMfw4Opq', // Nueva contraseña
    database: 'fia_fit_db', // Nueva base de datos
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    // Conecta al cliente de PostgreSQL
    await client.connect();

    // Maneja las solicitudes POST
    if (event.httpMethod === 'POST') {
      // Analiza los datos del formulario
      const formData = await parse(event);
      const { exercise_type_id, name, description } = formData;
      const img = formData.files[0];

      // Verifica que los campos requeridos estén presentes
      if (!exercise_type_id || !name) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
          },
          body: JSON.stringify({ error: 'Los campos "exercise_type_id" y "name" son requeridos.' }),
        };
      }

      // Imprime el tipo de contenido del archivo en la consola
      console.log(`Tipo de contenido del archivo: ${img.contentType}`);

      // Configura los parámetros para subir el archivo a S3
      const s3Params = {
        Bucket: 'exercisess', // Nombre del bucket en S3
        Key: `${img.filename}`,  // Nombre del archivo en S3
        Body: img.content, // Contenido del archivo
        ContentType: img.contentType, // Tipo de contenido del archivo
        ACL: 'public-read', // Configuración de permisos del archivo
      };

      // Sube el archivo a S3 y espera el resultado
      const uploadResult = await s3.upload(s3Params).promise();

      // Consulta SQL para insertar un nuevo ejercicio en la base de datos
      const query = `
        INSERT INTO t_exercises (exercise_type_id, name, description, image_url, created_at)
        VALUES ($1, $2, $3, $4, NOW()) RETURNING *`;
      const values = [exercise_type_id, name, description || '', uploadResult.Location];

      // Ejecuta la consulta en la base de datos
      const result = await client.query(query, values);

      // Retorna una respuesta exitosa con los datos del nuevo ejercicio
      return {
        statusCode: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
        },
        body: JSON.stringify({
          message: 'Ejercicio registrado exitosamente.',
          exercise: result.rows[0],
        }),
      };
    } else if (event.httpMethod === 'GET') {
      // Maneja las solicitudes GET
      const exerciseTypeId = event.queryStringParameters?.exercise_type_id;

      // Consulta SQL para seleccionar ejercicios según el tipo, o todos los ejercicios
      const query = exerciseTypeId
        ? 'SELECT * FROM t_exercises WHERE exercise_type_id = $1'
        : 'SELECT * FROM t_exercises';

      // Ejecuta la consulta en la base de datos
      const result = exerciseTypeId
        ? await client.query(query, [exerciseTypeId])
        : await client.query(query);

      // Retorna una respuesta exitosa con los datos de los ejercicios
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
        },
        body: JSON.stringify({
          exercises: result.rows,
        }),
      };
    } else if (event.httpMethod === 'DELETE') {
      // Maneja las solicitudes DELETE
      const exerciseId = event.queryStringParameters?.exercise_id;

      // Verifica que el parámetro exercise_id esté presente
      if (!exerciseId) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
          },
          body: JSON.stringify({ error: 'El parámetro "exercise_id" es requerido.' }),
        };
      }

      // Consulta SQL para eliminar un ejercicio por su ID
      const query = 'DELETE FROM t_exercises WHERE exercise_id = $1 RETURNING *';

      // Ejecuta la consulta en la base de datos
      const result = await client.query(query, [exerciseId]);

      // Retorna una respuesta exitosa o un error si el ejercicio no se encuentra
      if (result.rowCount > 0) {
        return {
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
          },
          body: JSON.stringify({
            message: 'Ejercicio eliminado exitosamente.',
            exercise: result.rows[0],
          }),
        };
      } else {
        return {
          statusCode: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
          },
          body: JSON.stringify({ error: 'Ejercicio no encontrado.' }),
        };
      }
    } else {
      // Maneja métodos HTTP no permitidos
      return {
        statusCode: 405,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
        },
        body: JSON.stringify({ error: 'Método no permitido' }),
      };
    }
  } catch (err) {
    // Maneja errores internos del servidor
    console.error('Error al realizar la operación:', err.message);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
      },
      body: JSON.stringify({ error: `Error interno del servidor: ${err.message}` }),
    };
  } finally {
    try {
      // Cierra la conexión a la base de datos
      await client.end();
    } catch (endErr) {
      console.error('Error al cerrar la conexión:', endErr.message);
    }
  }
}
