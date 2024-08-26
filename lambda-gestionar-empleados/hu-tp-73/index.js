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

const table_name = "personas"

export const handler = async (event) => {
    
    const { httpMethod, body, queryStringParameters } = event;
    
    if (httpMethod === 'POST') {
        try {
        const parsedBody = JSON.parse(body);
        
        const {
            dni, 
            nombres, 
            apellido_materno, 
            apellido_paterno, 
            distrito, 
            ciudad, 
            direccion, 
            genero
        } = parsedBody;
        
        // Los valores a insertar en la base de datos
        const values = [dni, nombres, apellido_materno, apellido_paterno, distrito, ciudad, direccion, genero];
        
        // Consulta SQL segura usando parámetros
        const query = `
            INSERT INTO ${table_name} (
                dni, nombres, apellido_materno, apellido_paterno, distrito, ciudad, direccion, genero
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;
        
        // Ejecución de la consulta
        const res = await pool.query(query, values);
        
        console.log('Inserción exitosa:', res.rows[0]);
        // Aquí puedes devolver una respuesta con el post insertado o algún mensaje de éxito
        return {
            statusCode: 200,
            body: JSON.stringify(res.rows[0]),
        };
        
    } catch (err) {
        console.error('Error al insertar los datos:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error al insertar los datos', details: err }),
        };
    }
    } else if (httpMethod === 'GET') {
        const dni = queryStringParameters?.dni;

        if (!dni) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'DNI es requerido' }),
            };
        }

        const apiUrl = `https://apiperu.dev/api/dni/${dni}?api_token=9ae0564c33d656544c4c2fc78b7678b0fd28e4ffc4e4c8e305b02b4d57aacad1`;

        try {
            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const data = await response.json();
            const persona = {
                dni: data.data.numero,
                nombres: data.data.nombres,
                apellido_paterno: data.data.apellido_paterno,
                apellido_materno: data.data.apellido_materno,
                direccion: '', // El usuario completará manualmente
                genero: '',    // El usuario completará manualmente
                ciudad: '',    // El usuario completará manualmente
                distrito: ''   // El usuario completará manualmente
            };

            return {
                statusCode: 200,
                body: JSON.stringify(persona),
            };

        } catch (error) {
            console.error('Error al consultar la API:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Error al consultar la API de RENIEC' }),
            };
        }
    } else {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Método no permitido' }),
        };
    }
};