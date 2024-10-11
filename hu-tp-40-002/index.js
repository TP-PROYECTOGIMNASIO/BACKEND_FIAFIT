import pkg from 'pg';
import AWS from 'aws-sdk';

// RESPONSABLE: Aythor Herlin 
// HISTORIA DE USUARIO: 40 - MANTENER PLAN DE TRATAMIENTO
// DESCRIPCION: Guardar registros de Tipos de ejercicios de tratamiento
// PATH: https://3zn8rhvzul.execute-api.us-east-2.amazonaws.com/api/plan-de-tratamiento/HU-TP-40
// METHODS: GET, POST

// Destructura el cliente de PostgreSQL
const { Client } = pkg;

export async function handler(event) {
  // Configura el cliente de PostgreSQL con los detalles de conexión
  const client = new Client({
    host: 'dpg-crq80452ng1s73e3ueu0-a.oregon-postgres.render.com', // Host de la base de datos
    port: 5432, // Puerto de conexión
    user: 'fia_fit_user', // Usuario de la base de datos
    password: 'VKEqqYetj5RXA1Eit0zizGWvoMfw4Opq', // Contraseña del usuario
    database: 'fia_fit_db', // Nombre de la base de datos
    ssl: {
      rejectUnauthorized: false, // Configuración SSL
    },
  });

  try {
    // Conecta al cliente de PostgreSQL
    await client.connect();

    if (event.httpMethod === 'GET') { //_________________________________________________________________________________________
      // Maneja las solicitudes GET

      // 1. Listar todos los tipos de ejercicio
      const query = 'SELECT * FROM public.t_treatment_exercise_types'; // Consulta para obtener todos los tipos de ejercicio
      const result = await client.query(query);
      return {
        statusCode: 200, // Código de estado HTTP
        headers: {
          'Access-Control-Allow-Origin': '*', // Permite acceso desde cualquier origen
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
        },
        body: JSON.stringify({ message: 'Tipos de ejercicio obtenidos exitosamente.', exerciseTypes: result.rows }),
      };

    } else if (event.httpMethod === 'POST') { //_________________________________________________________________________________________
      // Maneja las solicitudes POST
      const { name, description } = JSON.parse(event.body); // Obtiene el nombre y descripción del cuerpo de la solicitud

      // Verifica que los campos requeridos estén presentes
      if (!name) {
        return {
          statusCode: 400, // Código de error para solicitud incorrecta
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
          },
          body: JSON.stringify({ error: 'El campo "name" es requerido.' }),
        };
      }

      // 4. Registrar un nuevo tipo de ejercicio
      const insertQuery = `
        INSERT INTO public.t_treatment_exercise_types (name, description, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW()) RETURNING *`; // Consulta para insertar un nuevo tipo de ejercicio
      const values = [name, description || '']; // Valores a insertar

      try {
        const insertResult = await client.query(insertQuery, values); // Ejecuta la consulta de inserción
        return {
          statusCode: 201, // Código de estado para creación exitosa
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
          },
          body: JSON.stringify({
            message: 'Tipo de ejercicio registrado exitosamente.', // Mensaje de éxito
            exerciseType: insertResult.rows[0], // Devuelve el tipo de ejercicio registrado
          }),
        };
      } catch (err) {
        if (err.code === '23505') { // Código de error para violación de clave única
          return {
            statusCode: 409, // Conflicto: el tipo de ejercicio ya existe
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
            },
            body: JSON.stringify({ error: `El tipo de ejercicio "${name}" ya está registrado.` }), // Mensaje de error específico
          };
        }
        // Manejar otros errores
        console.error('Error al realizar la operación:', err.message); // Imprime el error en consola
        return {
          statusCode: 500, // Error interno del servidor
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
          },
          body: JSON.stringify({ error: `Error interno del servidor: ${err.message}` }),
        };
      }
    } else {
      // Maneja métodos HTTP no permitidos
      return {
        statusCode: 405, // Método no permitido
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
        },
        body: JSON.stringify({ error: 'Método no permitido' }), // Mensaje de error
      };
    }
  } catch (err) {
    // Maneja errores generales
    console.error('Error en la función Lambda:', err.message); // Imprime el error en consola
    return {
      statusCode: 500, // Error interno del servidor
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
      },
      body: JSON.stringify({ error: `Error interno del servidor: ${err.message}` }), // Mensaje de error
    };
  } finally {
    // Asegúrate de cerrar la conexión al cliente al final
    await client.end(); // Cierra la conexión a la base de datos
  }
}
