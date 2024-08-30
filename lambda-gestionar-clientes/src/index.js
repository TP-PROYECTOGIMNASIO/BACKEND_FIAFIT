import pkg from 'pg';
import AWS from 'aws-sdk';
import fetch from 'node-fetch';

// Inicializar el servicio de Cognito Identity Provider
const cognito = new AWS.CognitoIdentityServiceProvider();

// Configuración de la conexión a PostgreSQL
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

// Extrae datos del cuerpo de la solicitud
export const handler = async (event) => {
  const {
    document,
    mail,
    phone,
    password,
    photo,
    gender_id, // Ahora se usa gender_id directamente
    code,
    city,
    address,
    country,
    postal_code,
    emergency_contact,
    emergency_contact_phone_number
  } = JSON.parse(event.body);

  const client = await pool.connect();

  try {
    console.log('Datos recibidos:', {
      document,
      mail,
      phone,
      password,
      photo,
      gender_id,
      code,
      city,
      address,
      country,
      postal_code,
      emergency_contact,
      emergency_contact_phone_number
    });

    // Solicitar datos a la API de RENIEC
    const apiUrl = `https://apiperu.dev/api/dni/${document}?api_token=9ae0564c33d656544c4c2fc78b7678b0fd28e4ffc4e4c8e305b02b4d57aacad1`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Error al consultar la API de RENIEC: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Datos de RENIEC:', data);

    // const reniecData = {
    //   dni: data.data.numero,
    //   name: data.data.nombres,
    //   surname_father: data.data.apellido_paterno,
    //   surname_mother: data.data.apellido_materno
    // };
  
    const reniecData = {
      dni: "312123",
      name: "123123",
      surname_father: "123123",
      surname_mother: "123123"
    };
  
    // Iniciar transacción
    await client.query('BEGIN');

    // Generar username basado en las reglas proporcionadas
    const baseUsername = `${reniecData.name.charAt(0).toLowerCase()}${reniecData.surname_father.toLowerCase()}${reniecData.surname_mother.charAt(0).toLowerCase()}`;

    // Verificar si ya existe un usuario con el mismo username
    const usernameQuery = `
      SELECT c_user 
      FROM t_users 
      WHERE c_user LIKE '${baseUsername}%';
    `;
    const existingUsers = await client.query(usernameQuery);
    console.log('Usuarios existentes:', existingUsers.rows);

    let username = baseUsername;

    if (existingUsers.rows.length > 0) {
      username = `${baseUsername}${existingUsers.rows.length}`;
    }

    console.log('Nombre de usuario generado:', username);

    // Insertar usuario en t_users
    const userQuery = `
      INSERT INTO t_users (c_user, c_password, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      RETURNING user_id;
    `;
    const userValues = [username, password];
    const userResult = await client.query(userQuery, userValues);
    const userId = userResult.rows[0].user_id;

    console.log('ID de usuario:', userId);

    // Insertar datos en t_clients utilizando los datos de la API de RENIEC
    const clientQuery = `
      INSERT INTO t_clients (
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
        postal_code, 
        emergency_contact, 
        emergency_contact_phone_number, 
        created_at, 
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, 
        $9, 
        $10, $11, $12, $13, $14, $15, $16, NOW(), NOW()
      )
      RETURNING client_id;
    `;
    const clientValues = [
      userId, 
      reniecData.name, 
      reniecData.surname_father, 
      reniecData.surname_mother, 
      mail, 
      phone, 
      reniecData.dni, 
      photo, 
      gender_id, // Usar gender_id directamente
      code, 
      address, 
      city, 
      country, 
      postal_code, 
      emergency_contact, // Nombre del contacto de emergencia
      emergency_contact_phone_number // Número de teléfono del contacto de emergencia
    ];
    const clientResult = await client.query(clientQuery, clientValues);
    const clientId = clientResult.rows[0].client_id;

    console.log('ID de cliente:', clientId);

    // Confirmar transacción
    await client.query('COMMIT');
    
    const params = {
        ClientId: "3vtti4k65ef7qi9inqqa5911f7",
        Username: username,
        Password: password, // Usar una contraseña temporal si es necesario
        UserAttributes: [
            {
                Name: 'email',
                Value: mail
            },
            {
                Name: 'nickname',
                Value: username
            }
        ]
    };
    
    try {
        await cognito.signUp(params).promise();
        return {
            statusCode: 200,
            headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
            body: JSON.stringify({ message: 'Usuario creado exitosamente' }),
        };
    } catch (error) {
        console.error('Error al crear el usuario:', error);
        return {
            statusCode: 500,
            headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
            body: JSON.stringify({ message: 'Error al crear el usuario', error }),
        };
    }
  } finally {
    client.release();
  }
};
