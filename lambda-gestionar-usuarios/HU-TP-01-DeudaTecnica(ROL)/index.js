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
  
  try {
    const params = {
        ClientId: "7ekmlnhikbq4alfs8859rs4cp4",
        Username: "pugsitobbclient",
        Password: "Yasseravalos123_",
        UserAttributes: [
            {
                Name: 'email',
                Value: "nivardo_cano@usmp.pe" //Aquí se cambia el mail que se va a utilizar
            },
            {
                Name: 'nickname',
                Value: "pugsitobbclient" //Aquí se debe colocar el mismo usuario que en username
            },
            {
              Name: 'custom:role',
              Value: "cliente" //Asigna el rol "usuario"
            }
        ]
    };
    
    // Registrar usuario en Cognito
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
    return {
            statusCode: 500,
            headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
            body: JSON.stringify({ message: error }),
        };
  }
    
    return null;
  
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

    const reniecData = {
      dni: data.data.numero,
      name: data.data.nombres,
     surname_father: data.data.apellido_paterno,
      surname_mother: data.data.apellido_materno
    };

  
    // Iniciar transacción
    await client.query('BEGIN');

    // Generar username basado en las reglas proporcionadas
    const baseUsername = `${reniecData.name.charAt(0).toLowerCase()}${reniecData.surname_father.toLowerCase()}${reniecData.surname_mother.charAt(0).toLowerCase()}`;

    // Verificar si ya existe un usuario con el mismo username
    const usernameQuery = `
      SELECT \"user\"
      FROM t_users 
      WHERE user LIKE '${baseUsername}%';
    `;
    const existingUsers = await client.query(usernameQuery);
    console.log('Usuarios existentes:', existingUsers.rows);

    let username = baseUsername;
    
    // SI EL USERNAME YA EXISTE, CREAR ALGORITMO QUE CREE UNO NUEVO 1
    if (existingUsers.rows.length > 0) {
      username = "pugsitobb"
      //username = `${baseUsername}${existingUsers.rows.length}`;
    }
    
    
    
    console.log('Nombre de usuario generado:', username);

    // Insertar usuario en t_users
    const userQuery = `
      INSERT INTO t_users ("user", "password", "created_at", "updated_at")
      VALUES ($1, $2, NOW(), NOW())
      RETURNING user_id;
    `;
    
    // hardcodeando, pero deberia chapar el creado por ti
    
    const userValues = [username, password]; //incluye el rol
    const userResult = await client.query(userQuery, userValues);
    const userId = userResult.rows[0].user_id;

    console.log('ID de usuario:', userId);

    // Insertar datos en t_clients utilizando los datos de la API de RENIEC
    const clientQuery = `
      INSERT INTO t_clients (
        user_id,
        rol_id,
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
        entry_date,
        created_at, 
        updated_at
      )
      VALUES (
        $1, 1, $2, $3, $4, $5, $6, $7, $8, 
        $9, 
        $10, $11, $12, $13, $14, $15, $16, NOW(), NOW(), NOW()
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
        ClientId: "7ekmlnhikbq4alfs8859rs4cp4",
        Username: username,
        Password: password,
        UserAttributes: [
            {
                Name: 'email',
                Value: mail
            },
            {
                Name: 'nickname',
                Value: username
            },
            {
              Name: 'custom:role',
              Value: "usuario" //Asigna el rol "usuario"
            }
        ]
    };
    
    // Registrar usuario en Cognito
    await cognito.signUp(params).promise();
    
    // Añadir usuario al grupo de Cognito
    // const groupParams = {
    //   GroupName: 'cognito_pool_users',
    //   UserPoolId: 'kbbQNOdqg',  // Reemplaza con tu User Pool ID
    //   Username: username
    // };
    
    try {
        // await cognito.signUp(params).promise();
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