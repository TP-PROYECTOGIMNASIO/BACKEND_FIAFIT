import pkg from 'pg';
const { Client } = pkg;

export async function handler(event) {
    const client = new Client({
        user: 'db_gym_render_user',
        host: 'dpg-cr5568ij1k6c73934m10-a.oregon-postgres.render.com',
        database: 'db_gym_render',
        password: 'LusVdIcmARRFj7nY76BbOj9MzQ2Y33I5',
        port: 5432,
        ssl: {
            rejectUnauthorized: false // Solo en desarrollo. En producción, configura esto correctamente.
        }
    });

    try {
        await client.connect();

        // Verifica si el método HTTP es GET para listar las sedes
        if (event.httpMethod === 'GET') {
            const query = 'SELECT * FROM public.t_locations;';
            const res = await client.query(query);

            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({
                    message: 'Sedes listadas exitosamente',
                    locations: res.rows,
                }),
            };

        // Verifica si el método HTTP es PUT para actualizar una sede
        } else if (event.httpMethod === 'PUT') {
            const body = JSON.parse(event.body);
            const { location_id, status } = body;
            // Validación de parámetros
            if (location_id === undefined || status === undefined) {
                return {
                    statusCode: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                    },
                    body: JSON.stringify({ error: 'Los parámetros "location_id" y "status" son requeridos.' }),
                };
            }

            // Verifica que el parámetro 'status' sea booleano
            if (typeof status !== 'boolean') {
                return {
                    statusCode: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                    },
                    body: JSON.stringify({ error: 'El parámetro "status" debe ser un valor booleano.' }),
                };
            }

            // Consulta para actualizar la sede
            const query = `
                UPDATE t_locations
                SET status = $1, updated_at = NOW()
                WHERE location_id = $2
                RETURNING *`;
            const values = [status, location_id];
            const result = await client.query(query, values);

            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({
                    message: 'Sede actualizada exitosamente.',
                    location: result.rows[0],
                }),
            };

        } else {
            // Si no es ni GET ni PUT, retorna un error
            return {
                statusCode: 405,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({ error: 'Método no permitido' }),
            };
        }
    } catch (err) {
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
            },
            body: JSON.stringify({ message: 'Error interno del servidor', error: err.message }),
        };
    } finally {
        try {
            await client.end();
        } catch (endErr) {
            console.error('Error al cerrar la conexión:', endErr.message);
        }
    }
}
