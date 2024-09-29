import pkg from 'pg';
const { Client } = pkg;

export async function handler(event) {
    const client = new Client({
        user: process.env.DB_USER || 'fia_fit_user',
        host: process.env.DB_HOST || 'dpg-crq80452ng1s73e3ueu0-a.oregon-postgres.render.com',
        database: process.env.DB_NAME || 'fia_fit_db',
        password: process.env.DB_PASSWORD || 'VKEqqYetj5RXA1Eit0zizGWvoMfw4Opq',
        port: process.env.DB_PORT || 5432,
        ssl: {
            rejectUnauthorized: false // Configuración para entorno de producción
        }
    });

    try {
        await client.connect();
        const { httpMethod, queryStringParameters, body } = event;

        // Manejar solicitudes OPTIONS para CORS
        if (httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
            };
        }

        // 1. Listar membresías
        if (httpMethod === 'GET' && !queryStringParameters?.id) {
            const res = await client.query('SELECT * FROM t_memberships');
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({ memberships: res.rows }),
            };
        }

        // 2. Detalle de membresía (usando query params)
        if (httpMethod === 'GET' && queryStringParameters?.id) {
            const id = queryStringParameters.id;

            if (isNaN(Number(id))) {
                return {
                    statusCode: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                    },
                    body: JSON.stringify({ message: 'ID inválido' }),
                };
            }

            const res = await client.query('SELECT * FROM t_memberships WHERE membership_id = $1', [id]);
            if (res.rows.length === 0) {
                return {
                    statusCode: 404,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                    },
                    body: JSON.stringify({ message: 'Membresía no encontrada' }),
                };
            }

            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({ membership: res.rows[0] }),
            };
        }

        // 3. Actualizar membresía (PUT)
        if (httpMethod === 'PUT') {
            const { action, id } = JSON.parse(body);

            if (!action || !id) {
                return {
                    statusCode: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                    },
                    body: JSON.stringify({ message: 'Acción e ID son requeridos' }),
                };
            }

            let updateQuery;
            let message;

            switch (action) {
                case 'false':
                    updateQuery = `
                        UPDATE t_memberships
                        SET active = false
                        WHERE membership_id = $1
                        RETURNING *;
                    `;
                    message = 'Membresía desactivada exitosamente';
                    break;
                case 'true':
                    updateQuery = `
                        UPDATE t_memberships
                        SET active = true
                        WHERE membership_id = $1
                        RETURNING *;
                    `;
                    message = 'Membresía activada exitosamente';
                    break;
                default:
                    return {
                        statusCode: 400,
                        headers: {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Headers': 'Content-Type',
                            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                        },
                        body: JSON.stringify({ message: 'Acción no válida' }),
                    };
            }

            const res = await client.query(updateQuery, [id]);
            if (res.rows.length === 0) {
                return {
                    statusCode: 404,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                    },
                    body: JSON.stringify({ message: 'Membresía no encontrada' }),
                };
            }

            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({
                    message: message,
                    membership: res.rows[0],
                }),
            };
        }

        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
            },
            body: JSON.stringify({ message: 'Método no permitido' }),
        };

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
        await client.end();
    }
}
