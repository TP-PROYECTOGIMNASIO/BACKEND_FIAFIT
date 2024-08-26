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

const table_name = "empleados";

export const handler = async (event) => {
    
    const { httpMethod, queryStringParameters } = event;
    
    if (httpMethod === 'GET') {
        const dni = queryStringParameters?.dni;

        if (!dni) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'DNI es requerido' }),
            };
        }

        try {
            // Consulta SQL segura usando parámetros
            const query = `
                SELECT 
                    dni, 
                    nombres, 
                    apellido_paterno, 
                    apellido_materno, 
                    distrito, 
                    ciudad, 
                    direccion, 
                    genero, 
                    sede, 
                    contrato, 
                    rol
                FROM ${table_name} 
                WHERE dni = $1
            `;
            const values = [dni];

            // Ejecución de la consulta
            const res = await pool.query(query, values);

            if (res.rows.length === 0) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ message: 'Empleado no encontrado' }),
                };
            }

            return {
                statusCode: 200,
                body: JSON.stringify(res.rows[0]),
            };

        } catch (err) {
            console.error('Error al consultar la base de datos:', err);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Error al consultar la base de datos', details: err }),
            };
        }
    } else {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Método no permitido' }),
        };
    }
};
