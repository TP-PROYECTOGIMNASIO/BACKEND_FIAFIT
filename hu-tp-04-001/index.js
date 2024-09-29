import pkg from 'pg';
import AWS from 'aws-sdk';
import fetch from 'node-fetch';
import { parse } from 'lambda-multipart-parser';

// Configuración de AWS S3
const s3 = new AWS.S3();

// Configuración de la conexión a PostgreSQL
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

// Inicializar el servicio de Cognito Identity Provider
const cognito = new AWS.CognitoIdentityServiceProvider();

export const handler = async (event) => {
  try {
    // Parsear los datos del evento usando lambda-multipart-parser
    const formData = await parse(event);

    // Extraer los campos del formulario
    const { document, mail, phone, password, gender_id, code, city, address, country, emergency_contact, emergency_contact_phone_number } = formData;
    const img = formData.files ? formData.files[0] : null;  // Solo si hay un archivo

    // Si se proporciona una imagen, subirla a S3
    let imageUrl = null;
    if (img) {
      // Configura los parámetros para subir el archivo a S3
      const s3Params = {
        Bucket: 'fia-fit-files', // Nombre del bucket en S3
        Key: `${img.filename}`,  // Nombre único del archivo en S3
        Body: img.content, // Contenido del archivo
        ContentType: img.contentType, // Tipo de contenido del archivo
      };

      // Sube el archivo a S3
      const uploadResult = await s3.upload(s3Params).promise();
      imageUrl = uploadResult.Location;  // URL pública de la imagen
    }

    // Iniciar transacción
    const client = await pool.connect();
    await client.query('BEGIN');

    // Solicitar datos a la API de RENIEC
    const apiUrl = `https://apiperu.dev/api/dni/${document}?api_token=616976aa685120cf369324a5de495986c2d63e16833ce95a189db48a376c12f4`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Error al consultar la API de RENIEC: ${response.statusText}`);
    }

    const data = await response.json();
    const reniecData = {
      document: data.data.numero,
      names: data.data.nombres,
      father_last_name: data.data.apellido_paterno,
      mother_last_name: data.data.apellido_materno
    };

    // Generar username basado en las reglas proporcionadas
    const baseUsername = `${reniecData.names.charAt(0).toLowerCase()}${reniecData.father_last_name.toLowerCase()}${reniecData.mother_last_name.charAt(0).toLowerCase()}`;
    const usernameQuery = `SELECT "user" FROM t_users WHERE "user" LIKE '${baseUsername}%';`;
    const existingUsers = await client.query(usernameQuery);
    let username = baseUsername;

    if (existingUsers.rows.length > 0) {
      username = `${baseUsername}${existingUsers.rows.length}`;
    }

    // Insertar usuario en t_users
    const userQuery = `
      INSERT INTO t_users ("user", password, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      RETURNING user_id;
    `;
    const userValues = [username, password];
    const userResult = await client.query(userQuery, userValues);
    const userId = userResult.rows[0].user_id;

    // Insertar datos en t_clients
    const id_cliente_libre = await findIdByRolName("Cliente Libre");
    const clientQuery = `
      INSERT INTO t_clients (
        rol_id,
        user_id, 
        names,
        father_last_name, 
        mother_last_name, 
        mail, 
        phone_number, 
        document, 
        image_url, 
        gender_id, 
        check_in_code, 
        address, 
        city, 
        country, 
         
        emergency_contact, 
        emergency_contact_phone_number, 
        entry_date,
        created_at, 
        updated_at
      )
      VALUES (${id_cliente_libre}, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW(), NOW())
      RETURNING client_id;
    `;
    const clientValues = [
       
      userId, 
      reniecData.names, 
      reniecData.father_last_name, 
      reniecData.mother_last_name, 
      mail, 
      phone, 
      reniecData.document, 
      imageUrl,  // URL de la imagen cargada, o null si no se subió ninguna
      gender_id, 
      code, 
      address, 
      city, 
      country, 
       
      emergency_contact, 
      emergency_contact_phone_number
    ];
    const clientResult = await client.query(clientQuery, clientValues);
    const clientId = clientResult.rows[0].client_id;

    // Confirmar transacción
    await client.query('COMMIT');

    // Registrar usuario en Cognito
    const params = {
      ClientId: "7ekmlnhikbq4alfs8859rs4cp4",
      Username: username,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: mail },
        { Name: 'nickname', Value: username },
        { Name: 'custom:role', Value: "cliente_libre" }
      ]
    };
    await cognito.signUp(params).promise();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
      },
      body: JSON.stringify({ message: 'Usuario creado exitosamente', userId: userId, username: username }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
      },
      body: JSON.stringify({ message: 'Error al crear el usuario', error: error.message }),
    };
  }
};

// Función para devolver el ID del rol fijo
async function findIdByRolName(rolName) {
  return 3; // Valor fijo
}
