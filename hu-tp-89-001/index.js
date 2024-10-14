import pkg from 'pg';

//************************************************************************************************/
//******************************************COMENTARIOS******************************************/
// RESPONSABLE: Sandro Ramos Nieto
// HISTORIA DE USUARIO: 89 - REGISTRAR MÉTRICAS COMO NUTRICIONISTA
// DESCRIPCIÓN: 
// PATH: /hu-tp-89
// METHODS: POST 
//************************************************************************************************/

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

const headers = {
    'Access-Control-Allow-Origin': '*', // Permitir solicitudes desde cualquier origen
    'Access-Control-Allow-Headers': 'Content-Type', // Permitir ciertos encabezados
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,PATCH', // Permitir ciertos métodos HTTP
};

// Función principal manejadora del evento
export const handler = async (event) => {
    const { httpMethod, queryStringParameters } = event;

    if (httpMethod === 'OPTIONS') {
        // Responder a la verificación CORS
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight check successful' }),
        };
    } 
    
    if (httpMethod === 'GET') {
        const clientId = queryStringParameters?.client_id;

        if (clientId) {
            // Buscar por
            return await findClientsDetails(clientId);
        }
    }
    
    if (httpMethod === 'POST') {
        const bm_client = queryStringParameters?.bm_client; // Obtener el client_id desde query params
        
        if (!bm_client) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'El parámetro bm_client es obligatorio' }),
            };
        }
        const body = event.body;

        if (!body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'El cuerpo de la solicitud está vacío' }),
            };
        }

        // Parsear el cuerpo
        let data;
        try {
            data = JSON.parse(body); 
        } catch (error) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'El cuerpo de la solicitud no es un JSON válido' }),
            };
        }

        return await registerMetrics(data, bm_client);
    }

    // Método no permitido
    return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ message: 'Método no permitido' }),
    };
};


// Función que busca clientes por tipo de membresía
async function findClientsDetails(clientId) {


    try {
        // Consulta para obtener los detalles del cliente con métricas y objetivos nutricionales
        const clientQuery = `
            SELECT 
                c.client_id AS client_id, 
                CONCAT(c.names, ' ', c.father_last_name, ' ', c.mother_last_name) AS nombres, 
                g.gender AS genero, 
                bm.weight, 
                bm.height, 
                bm.imc, 
                gl.name AS objeNutri
            FROM t_clients AS c 
            INNER JOIN t_genders AS g ON g.gender_id = c.gender_id 
            LEFT JOIN t_body_metrics AS bm ON bm.client_id = c.client_id
            LEFT JOIN t_goals AS gl ON gl.goal_id = bm.goal_id
            WHERE c.client_id = $1
        `;
        const result = await pool.query(clientQuery, [clientId]);

        // Si no se encuentran clientes
        if (result.rowCount === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'Sin Datos del Cliente' }),
            };
        }

        const clientData = result.rows[0];

        // Verificar si alguna de las métricas es nula
        if (clientData.weight === null || clientData.height === null || clientData.imc === null || clientData.objeNutri === null) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: 'Aún no cuenta con métricas registradas.',
                    data: {
                        client_id: clientData.client_id,
                        nombres: clientData.nombres,
                        genero: clientData.genero
                    }
                }),
            };
        }

        // Si las métricas no son nulas, devolver todos los datos
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                data: {
                    client_id: clientData.client_id,
                    nombres: clientData.nombres,
                    genero: clientData.genero,
                    weight: clientData.weight,
                    height: clientData.height,
                    imc: clientData.imc,
                    objeNutri: clientData.objeNutri
                }
            }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal server error', error: error.message }),
        };
    }
}





// Función que registra o actualiza métricas, y actualiza o inserta en t_goals
async function registerMetrics(data, bm_client) {
    const { height, weight, imc, name } = data;

    // Verificar que todos los campos necesarios estén presentes
    if (!height || !weight || !imc || !name) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Todos los campos son obligatorios (height, weight, imc, name)' }),
        };
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Obtener la fecha actual en formato adecuado
        const now = new Date();

        // Verificar si el cliente ya tiene métricas registradas en t_body_metrics
        const checkClientMetricsQuery = `
            SELECT * FROM t_body_metrics WHERE client_id = $1
        `;
        const checkClientMetricsResult = await client.query(checkClientMetricsQuery, [bm_client]);

        if (checkClientMetricsResult.rowCount > 0) {
            // Si ya existe una métrica para el cliente, verificar antes de actualizar el objetivo

            // Validar si el nombre del objetivo ya está en uso en t_goals
            const checkGoalNameQuery = `
                SELECT * FROM t_goals WHERE name = $1
            `;
            const checkGoalNameResult = await client.query(checkGoalNameQuery, [name]);

            if (checkGoalNameResult.rowCount > 0) {
                // Si el nombre del objetivo ya existe, retornar un mensaje de error
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ message: 'Poner un objetivo nutricional diferente' }),
                };
            }

            // Si no existe un objetivo duplicado, actualizar el nombre del objetivo en t_goals
            const updateMetricsQuery = `
                UPDATE t_body_metrics
                SET metric_date = $1, height = $2, weight = $3, imc = $4, updated_at = NOW()
                WHERE client_id = $5
            `;
            await client.query(updateMetricsQuery, [now, height, weight, imc, bm_client]);

            const updateGoalQuery = `
                UPDATE t_goals
                SET name = $1, updated_at = NOW()
                WHERE goal_id = (
                    SELECT goal_id FROM t_body_metrics WHERE client_id = $2
                )
            `;
            await client.query(updateGoalQuery, [name, bm_client]);

            await client.query('COMMIT');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'Métricas y meta actualizadas correctamente' }),
            };

        } else {
            // Si no existe métrica y no hay duplicados de nombre en t_goals, insertar en ambas tablas
            const checkGoalNameQuery = `
                SELECT * FROM t_goals WHERE name = $1
            `;
            const checkGoalNameResult = await client.query(checkGoalNameQuery, [name]);

            if (checkGoalNameResult.rowCount > 0) {
                // Si el nombre del objetivo ya existe, retornar un mensaje de error
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ message: 'Poner un objetivo nutricional diferente' }),
                };
            }

            const insertGoalQuery = `
                INSERT INTO t_goals (name, created_at, updated_at)
                VALUES ($1, NOW(), NOW())
                RETURNING goal_id
            `;
            const goalResult = await client.query(insertGoalQuery, [name]);
            const goalId = goalResult.rows[0].goal_id;

            const insertMetricsQuery = `
                INSERT INTO t_body_metrics (metric_date, height, weight, imc, goal_id, client_id, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            `;
            await client.query(insertMetricsQuery, [now, height, weight, imc, goalId, bm_client]);

            await client.query('COMMIT');
            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({ message: 'Métricas y meta registradas correctamente' }),
            };
        }

    } catch (error) {
        await client.query('ROLLBACK');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Error interno del servidor', error: error.message }),
        };
    } finally {
        client.release();
    }
}




