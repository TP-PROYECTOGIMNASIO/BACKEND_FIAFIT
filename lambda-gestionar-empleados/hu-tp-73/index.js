import pkg from 'pg';
import fetch from 'node-fetch';

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

// Nombre de la tabla en la base de datos
const table_name = "t_staff"

export const handler = async (event) => {
    
    const { httpMethod, body, queryStringParameters } = event;
    
    // Manejo de la solicitud HTTP de tipo POST para insertar datos en la base de datos
    if (httpMethod === 'POST') {
        try {
        
        // Se parsea el cuerpo de la solicitud para obtener los datos del usuario
        const parsedBody = JSON.parse(body);
        
        const {
            c_document, 
            c_names, 
            father_last_name, 
            mother_last_name, 
            city,
            district,
            address, 
            gender_id,
            rol_id,
            location_id,
            contract_url
        } = parsedBody;
        
        // Valores que se insertan en la base de datos
        const values = [c_document, c_names, father_last_name, mother_last_name, city, district, address, gender_id, rol_id, location_id, contract_url];
        
        // Consulta SQL para insertar los datos en la tabla "personas"
        const query = `
            INSERT INTO ${table_name} (
        c_document, c_names, father_last_name, mother_last_name, city, district, address, gender_id, rol_id, location_id, contract_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *;
        `;
        // Ejecución de la consulta
        const res = await pool.query(query, values);
        
        console.log('Inserción exitosa:', res.rows[0]);
        
        // Respuesta de éxito con el post insertado
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
            },
            body: JSON.stringify(res.rows[0]),
        };
        
    } catch (err) {
        
        // Manejo de errores en la inserción de datos
        console.error('Error al insertar los datos:', err);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
            },
            body: JSON.stringify({ error: 'Error al insertar los datos', details: err }),
        };
    }
    
    // Manejo de la solicitud HTTP de tipo GET para obtener datos de la API de RENIEC
    } else if (httpMethod === 'GET') {
        const c_document = queryStringParameters?.c_document;
        
        // Validación de que el DNI fue proporcionado en la solicitud
        if (!c_document) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
                body: JSON.stringify({ message: 'DNI es requerido' }),
            };
        }
        
        // URL de la API de RENIEC para obtener información del DNI
        const apiUrl = `https://apiperu.dev/api/dni/${c_document}?api_token=0c3943eeea8e4e7925728bf57c57789d895bb6e9de1ff2d8ef4dfd5b9a44aa8b`;

        try {
            // Solicitud a la API de RENIEC
            const response = await fetch(apiUrl);

            // Validación de que la solicitud a la API fue exitosa
            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }
            
            // Parseo de la respuesta de la API para extraer los datos
            const data = await response.json();
            const t_staff = {
                c_document: data.data.numero,
                c_names: data.data.nombres,
                father_last_name: data.data.apellido_paterno,
                mother_last_name: data.data.apellido_materno,
                city: '', // Ingreso de datos manual
                district: '', // Ingreso de datos manual
                address: '',    // Ingreso de datos manual
                gender_id: '',    // Ingreso de datos manual
                rol_id: '',    // Ingreso de datos manual
                location_id: '',    // Ingreso de datos manual
                contract_url: ''    // Ingreso de datos manual
            };

            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
                body: JSON.stringify(t_staff),
            };

        } catch (error) {
            
            // Manejo de errores en la solicitud a la API de RENIEC
            console.error('Error al consultar la API:', error);
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
                body: JSON.stringify({ message: 'Error al consultar la API de RENIEC' }),
            };
        }
    
    // Manejo de métodos HTTP no permitidos
    } else {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
            },
            body: JSON.stringify({ message: 'Método no permitido' }),
        };
    }
};
