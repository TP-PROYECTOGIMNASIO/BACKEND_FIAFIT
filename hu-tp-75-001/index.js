import pkg from 'pg';

// Configuración de la conexión al pool de PostgreSQL
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

// Definición de la tabla y columna utilizada
const table_name = "t_staff";
const column_id = "staff_id";

export const handler = async (event) => {
    // Validación de la entrada para asegurarse de que 'staff_id' se proporciona
    const id = event.queryStringParameters?.staff_id;
    if (!id) {
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
            },
            body: JSON.stringify({ message: 'staff_id is required' }),
        };
    }

    try {
        // Consulta para obtener el estado actual del registro
        const selectQuery = `SELECT active FROM ${table_name} WHERE ${column_id} = $1`;
        const selectRes = await pool.query(selectQuery, [id]);

        // Verifica si se encontró el registro
        if (selectRes.rows.length === 0) {
            return {
                statusCode: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
                },
                body: JSON.stringify({ message: `Staff member ${id} not found.` }),
            };
        }

        const currentStatus = selectRes.rows[0].status;

        // Inversión del estado actual (si está activado, se desactiva, y viceversa)
        const newStatus = !currentStatus;

        // Actualiza el estado del registro en la base de datos
        const updateQuery = `UPDATE ${table_name} SET active = $1 WHERE ${column_id} = $2`;
        await pool.query(updateQuery, [newStatus, id]);

        // Devuelve el nuevo estado
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
            },
            body: JSON.stringify({
                message: `Staff member ${id} is now ${newStatus ? 'enabled (true)' : 'disabled (false)'}.`,
                status: newStatus,
            }),
        };
    } catch (error) {
        // Manejo de errores
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
            },
            body: JSON.stringify({ message: 'An error occurred while processing your request.', error: error.message }),
        };
    }
};