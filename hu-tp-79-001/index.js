import pkg from 'pg';
const { Pool } = pkg;


// RESPONSABLE: ELISBAN ANDERSON MAMANI JARA
// HISTORIA DE USUARIO:79 - ACTUALIZAR MEMBRESIAS
// DESCRIPCION: PODER HABILITAR O DESABILITAR LAS MEMBRESIAS
// PATH: /membresias/hu-tp-79
// METHODS: GET, PUT
// TABLAS UTILIZADAS: t_memberships

// Configuración del pool de conexiones
const pool = new Pool({
    user: process.env.DB_USER || 'fia_fit_user',
    host: process.env.DB_HOST || 'dpg-crq80452ng1s73e3ueu0-a.oregon-postgres.render.com',
    database: process.env.DB_NAME || 'fia_fit_db',
    password: process.env.DB_PASSWORD || 'VKEqqYetj5RXA1Eit0zizGWvoMfw4Opq',
    port: process.env.DB_PORT || 5432,
    ssl: {
        rejectUnauthorized: false // Configuración para entorno de producción
    }
});

export async function handler(event) {
    const client = await pool.connect();

    try {
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

        // 2. Obtener detalles y actualizar membresía (PUT)
        if (httpMethod === 'PUT') {
            const { id, description, price, action } = JSON.parse(body);

            if (!id) {
                return {
                    statusCode: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                    },
                    body: JSON.stringify({ message: 'ID es requerido' }),
                };
            }

            let updateQuery = '';
            let values = [];

            // Actualizar descripción y precio
            if (description || price) {
                const setClauses = [];
                if (description) {
                    setClauses.push('description = $1');
                    values.push(description);
                }
                if (price) {
                    setClauses.push('price = $2');
                    values.push(price);
                }
                values.push(id); // Agregar el ID al final para el WHERE
                updateQuery = `UPDATE t_memberships SET ${setClauses.join(', ')} WHERE membership_id = $3 RETURNING *;`;
            }

            // Cambiar estado de activo/inactivo con true activa, false desactiva
            if (action !== undefined) {
                updateQuery = `
                    UPDATE t_memberships
                    SET active = $1
                    WHERE membership_id = $2
                    RETURNING *;
                `;
                values = [action, id];  // 'action' ya es true o false
            }

            const res = await client.query(updateQuery, values);
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
                    message: action ? 'Membresía activada exitosamente' : 'Membresía desactivada exitosamente',
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
        client.release();  // Liberar el cliente de la pool
    }
}
