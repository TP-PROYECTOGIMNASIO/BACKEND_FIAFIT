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
        // Verifica que la solicitud sea un PUT
        if (event.httpMethod !== 'PUT') {
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

        // Conectar a la base de datos
        await client.connect();

        // Procesar la solicitud
        const { action, id } = JSON.parse(event.body);

        if (!action || !id) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
                body: JSON.stringify({ message: 'Acción e ID de son requeridos' }),
            };
        }

        let updateQuery;
        let message;

        switch (action) {
            case 'disable':
                updateQuery = `
                    UPDATE t_memberships
                    SET status = 'inactive'
                    WHERE membership_id = $1
                    RETURNING *;
                `;
                message = 'Membresia desactivada exitosamente';
                break;
            case 'enable':
                updateQuery = `
                    UPDATE t_memberships
                    SET status = 'active'
                    WHERE membership_id = $1
                    RETURNING *;
                `;
                message = 'Membrsia activada exitosamente';
                break;
            default:
                return {
                    statusCode: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                        'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
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
                'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
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
                'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
            },
            body: JSON.stringify({ message: 'Error interno del servidor', error: err.message }),
        };
    }
}
