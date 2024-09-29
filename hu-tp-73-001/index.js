import pkg from 'pg';
import AWS from 'aws-sdk';
import fetch from 'node-fetch';
import { parse } from 'lambda-multipart-parser'; // Para procesar archivos

const cognito = new AWS.CognitoIdentityServiceProvider();

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

// Configuración del cliente de S3
const s3 = new AWS.S3();

// Nombre de la tabla en la base de datos
const staff_table = "t_staff";
const users_table = "t_users";

// Función para generar el nombre de usuario
const generarNombreUsuario = async (names, father_last_name, mother_last_name) => {
  let baseUsername = `${names[0]}${mother_last_name}${father_last_name[0]}`.toLowerCase();
  const query = `SELECT COUNT(*) FROM ${users_table} WHERE user LIKE '${baseUsername}%'`;
  const res = await pool.query(query);
  const count = parseInt(res.rows[0].count);

  if (count > 0) {
      baseUsername = `${baseUsername}${count}`;
  }

  return baseUsername;
};

// Función para crear usuario en Cognito
const crearUsuarioEnCognito = async (username, email, password) => {
  const params = {
      ClientId: '7ekmlnhikbq4alfs8859rs4cp4', // ID del cliente de Cognito
      Username: username,
      Password: "Yasseravalos123_",
      UserAttributes: [
          { Name: 'email', Value: email },
          //{ Name: 'email_verified', Value: 'false' }
      ]
  };
  return cognito.signUp(params).promise();
};

export const handler = async (event) => {
  const { httpMethod, queryStringParameters } = event;

  // Manejo de la solicitud HTTP de tipo POST para insertar datos en la base de datos
  if (httpMethod === 'POST') {
    try {
      const formData = await parse(event);
      const {
          document, 
          names, 
          father_last_name, 
          mother_last_name,
          email,
          city,
          district,
          address, 
          gender_id,
          role_id,
          location_id
      } = formData;
      
      const file = formData.files[0]; 
      
      if (!file) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
          },
          body: JSON.stringify({ message: 'No se proporcionó ningún archivo' }),
        };
      }
      // Validar si el correo ya está en uso
      const emailQuery = `SELECT * FROM ${staff_table} WHERE email = $1`;
      const emailResult = await pool.query(emailQuery, [email]);

      if (emailResult.rows.length > 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'El correo electrónico ya está asociado a una cuenta' })
        };
      }
      
      // Generar nombre de usuario automáticamente
      const username = await generarNombreUsuario(names, father_last_name, mother_last_name);
      
      // Contraseña inicial será el número de documento
      const password = document; 
      
      await crearUsuarioEnCognito(username, email, password);
      
      // Insertar en la tabla de usuarios
      const insertUserQuery = `
        INSERT INTO ${users_table} ("user", password, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        RETURNING user_id;
      `;
      const userResult = await pool.query(insertUserQuery, [username, password]);
      const user_id = userResult.rows[0].user_id;

      // Parámetros para subir el archivo a S3
      const s3Params = {
        Bucket: 'fia-fit-files', 
        Key: `${file.filename}`, 
        Body: file.content, 
        ContentType: file.contentType, 
      };
      
      // Subir el archivo a S3
      const uploadResult = await s3.upload(s3Params).promise();
      const contract_url = uploadResult.Location; // URL pública del archivo subido
      
      // Insertar empleado
      const insertStaffQuery = `
        INSERT INTO ${staff_table} (
          document, names, father_last_name, mother_last_name, email, city, district, address, gender_id, role_id, location_id, contract_url, user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *;
      `;
      const staffValues = [document, names, father_last_name, mother_last_name, email, city, district, address, gender_id, role_id, location_id, contract_url, user_id];
      const staffResult = await pool.query(insertStaffQuery, staffValues);

      

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
        },
        body: JSON.stringify(staffResult.rows[0]),
      };

    } catch (err) {
      console.error('Error al insertar los datos:', err);
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
        },
        body: JSON.stringify({ error: 'Error al insertar los datos', details: err.message }),
      };
    }
  }

  else if (httpMethod === 'GET') {
    const document = queryStringParameters?.document;
    
    if (!document) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
        },
        body: JSON.stringify({ message: 'DNI es requerido' }),
      };
    }

    const apiUrl = `https://apiperu.dev/api/dni/${document}?api_token=616976aa685120cf369324a5de495986c2d63e16833ce95a189db48a376c12f4`;

    try {
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      const t_staff = {
        document: data.data.numero,
        names: data.data.nombres,
        father_last_name: data.data.apellido_paterno,
        mother_last_name: data.data.apellido_materno,
        email: '',
        city: '',
        district: '',
        address: '',
        gender_id: '',
        role_id: '',
        location_id: '',
        contract_url: ''
      };

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
        },
        body: JSON.stringify(t_staff),
      };

    } catch (error) {
      console.error('Error al consultar la API:', error);
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
        },
        body: JSON.stringify({ message: 'Error al consultar la API de RENIEC' }),
      };
    }
  }

  else {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
      },
      body: JSON.stringify({ message: 'Método no permitido' }),
    };
  }
};
