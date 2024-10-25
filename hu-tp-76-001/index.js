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

//CONTACTO: NIVARDO CANO
//RESPONSABLE: NIVARDO CANO
//HISTORIA DE USUARIO: 76 - REGISTRAR SEDES
//DESCRIPCION: Mejorar la gestión de sedes actuales
//PATH: api/planillas-por-sedes/hu-tp-76
//METHODS: POST
// TABLAS UTILIZADAS: t_locations
export async function handler(event) {
  // Configura el cliente de PostgreSQL con los parámetros de conexión
  const client = new Client({
    host: 'dpg-crq80452ng1s73e3ueu0-a.oregon-postgres.render.com', // Nuevo host
    port: 5432,
    user: 'fia_fit_user', // Nuevo usuario
    password: 'VKEqqYetj5RXA1Eit0zizGWvoMfw4Opq', // Nueva contraseña
    database: 'fia_fit_db', // Nueva base de datos
    ssl: {
      rejectUnauthorized: false, // Asegura que el cliente pueda conectar aunque el certificado no sea verificado
    },
  });

  console.log("Hola");

  try {
    // Conecta al cliente de PostgreSQL
    await client.connect();

    // Verifica si el método HTTP de la solicitud es POST
    if (event.httpMethod === 'POST') {
      // Analiza los datos del formulario multipart
      const formData = await parse(event);

      // Extrae los campos necesarios del formulario se añadieron latitud y longitud
      const { name, departamento, provincia, distrito, lat, long } = formData;

      // Concatenar departamento, provincia y distrito en una sola cadena para el campo 'address'
      const address = `${departamento}, ${provincia}, ${distrito}`;

      // Verifica que los campos 'name', 'departamento', 'provincia', 'distrito', 'lat' y 'long' estén presentes
      if (!name || !departamento || !provincia || !distrito || !lat || !long) {
        return {
          statusCode: 400, // Código de estado HTTP para solicitud incorrecta
          headers: {
            'Access-Control-Allow-Origin': '*',  // Permite solicitudes desde cualquier origen
            'Access-Control-Allow-Headers': 'Content-Type',  // Permite ciertos encabezados
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permite ciertos métodos HTTP
          },
          body: JSON.stringify({ error: 'Los campos "name", "departamento", "provincia", "distrito", "lat" y "long" son requeridos.' }),
        };
      }

      // Extrae el archivo del formulario
      const file = formData.files[0];

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
        INSERT INTO t_locations (name, address, image_url, lat, long, active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, True, NOW(), NOW()) RETURNING *`;
      // Define los valores a insertar en la base de datos
      const values = [name, address, imageUrl, lat, long];

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

/*API DE GOOGLE MAPS
https://github.com/yasseram1/api-google-maps-test/tree/main
VITE_API_KEY="AIzaSyDHaYU-i1o6tNh3Cic8aXRETgde7qL5W-4"
VITE_MAP_ID="23e9d71b4b149c7"
*/