import pkg from 'pg';

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

// Nombre de la tabla de la base de datos
const table_name = "t_staff";

// Definir los encabezados CORS una vez para reutilizarlos
const headers = {
  'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
  'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
};

export const handler = async (event) => {
    
    const { httpMethod, queryStringParameters } = event;
    
    // Verifica si el método HTTP es GET
    if (httpMethod === 'GET') {
        const document = queryStringParameters?.document;
        
        // Si no se envió ningún DNI, lista a todos los staff
        if (document == null) {
            try {
                // Consulta SQL para obtener todos los empleados
                const query = `
                    SELECT 
                        staff_id, document, names, father_last_name, mother_last_name, city, district, address, gender_id, rol_id, location_id, contract_url, active
                    FROM ${table_name} 
                `;

                // Ejecución de la consulta
                const res = await pool.query(query);

                // Respuesta de éxito con los datos de los empleados
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(res.rows),
                };
            } catch (err) {
                console.error('Error al listar el personal:', err);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ message: 'Error al listar el personal', error: err.message }),
                }
            }
        }

        // Si se proporcionó un DNI, obtener el empleado correspondiente
        try {
            // Consulta SQL para obtener el empleado por DNI
            const query = `
                SELECT 
                    document, names, father_last_name, mother_last_name, city, district, address, gender_id, rol_id, location_id, contract_url
                FROM ${table_name} 
                WHERE document = $1
            `;
            const values = [document];

            // Ejecución de la consulta
            const res = await pool.query(query, values);

            if (res.rows.length === 0) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ message: 'Empleado no encontrado' }),
                };
            }
            
            // Respuesta de éxito con los datos del empleado
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(res.rows[0]),
            };

        } catch (err) {
            // Manejo de errores en la consulta a la base de datos
            console.error('Error al consultar la base de datos:', err);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Error al consultar la base de datos', details: err.message }),
            };
        }
    } else {
        // Respuesta para métodos HTTP no permitidos
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ message: 'Método no permitido' }),
        };
    }
};
