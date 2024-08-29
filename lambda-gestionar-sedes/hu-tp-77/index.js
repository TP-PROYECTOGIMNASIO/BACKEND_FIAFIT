import pkg from 'pg';
const { Client } = pkg;

export async function handler(event) {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,PUT,GET,POST'
            },
            body: '',
        };
    }

    const client = new Client({
        user: 'db_gym_render_user',
        host: 'dpg-cr5568ij1k6c73934m10-a.oregon-postgres.render.com',
        database: 'db_gym_render',
        password: 'LusVdIcmARRFj7nY76BbOj9MzQ2Y33I5',
        port: 5432,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        if (event.httpMethod !== 'PUT') {
            return {
                statusCode: 405,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,PUT,GET,POST'
                },
                body: JSON.stringify({ message: 'Método no permitido' }),
            };
        }

        await client.connect();

        const { action, id } = JSON.parse(event.body);

        if (!action || !id) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,PUT,GET,POST'
                },
                body: JSON.stringify({ message: 'Acción e ID de sede son requeridos' }),
            };
        }

        let updateQuery;
        let message;

        switch (action) {
            case 'disable':
                updateQuery = `
                    UPDATE public.t_locations
                    SET status = 'inactive'
                    WHERE location_id = $1
                    RETURNING *;
                `;
                message = 'Sede desactivada exitosamente';
                break;
            case 'enable':
                updateQuery = `
                    UPDATE public.t_locations
                    SET status = 'active'
                    WHERE location_id = $1
                    RETURNING *;
                `;
                message = 'Sede activada exitosamente';
                break;
            default:
                return {
                    statusCode: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'OPTIONS,PUT,GET,POST'
                    },
                    body: JSON.stringify({ message: 'Acción no válida' }),
                };
        }

        const res = await client.query(updateQuery, [id]);
        const updatedLocation = res.rows[0];

        await client.end();

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,PUT,GET,POST'
            },
            body: JSON.stringify({
                message: message,
                location: updatedLocation,
            }),
        };
    } catch (err) {
        await client.end();
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,PUT,GET,POST'
            },
            body: JSON.stringify({ message: 'Error interno del servidor', error: err.message }),
        };
    }
}
