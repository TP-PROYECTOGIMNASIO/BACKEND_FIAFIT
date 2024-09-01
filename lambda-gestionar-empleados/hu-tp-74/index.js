import pkg from 'pg';

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

// Nombre de la tabla de la base de datos
const table_name = "t_staff";

export const handler = async (event) => {
    
    const { httpMethod, queryStringParameters } = event;
    
    // Verifica si el metodo HTTP es GET
    if (httpMethod === 'GET') {
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

        try {
            
            // Consulta SQL para obtener los datos del empleado en base al DNI proporcionado
            const query = `
                SELECT 
                    c_document, c_names, father_last_name, mother_last_name, city, district, address, gender_id, rol_id, location_id, contract_url
                FROM ${table_name} 
                WHERE c_document = $1
            `;
            const values = [c_document];

            // Ejecución de la consulta
            const res = await pool.query(query, values);

            if (res.rows.length === 0) {
                return {
                    statusCode: 404,
                    headers: {
                        'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                        'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                    },
                    body: JSON.stringify({ message: 'Empleado no encontrado' }),
                };
            }
            
            // Respuesta de éxito con los datos del empleado
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
            // Manejo de errores en la consulta a la base de datos
            console.error('Error al consultar la base de datos:', err);
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
                body: JSON.stringify({ error: 'Error al consultar la base de datos', details: err }),
            };
        }
    } else {        
        // Respuesta para métodos HTTP no permitidos
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
