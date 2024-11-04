import pkg from 'pg';
const { Pool } = pkg;

// Configuración del cliente para conectarse a la base de datos PostgreSQL
const pool = new Pool({
    user: 'fia_fit_user',                          
    host: 'dpg-crq80452ng1s73e3ueu0-a.oregon-postgres.render.com', 
    database: 'fia_fit_db',                        
    password: 'VKEqqYetj5RXA1Eit0zizGWvoMfw4Opq',  
    port: 5432,                                    
    ssl: {
        rejectUnauthorized: false                  
    }
});

export const handler = async (event) => {
    // Extraer método HTTP, parámetros de consulta y cuerpo de la solicitud
    const { httpMethod, queryStringParameters, body } = event;

    try {
        let result;

        if (httpMethod === 'GET') {
            if (!queryStringParameters) {
                // GET: Obtener todos los datos de la tabla `t_events`
                result = await pool.query('SELECT * FROM t_events');
            } else if (queryStringParameters.detail === 'true') {
                // GET: Obtener solo los campos detallados de `t_events`
                result = await pool.query(`
                    SELECT image_url, name, description, requirements, location_id, capacity, event_date, schedule
                    FROM t_events
                `);
            } else if (queryStringParameters.date) {
                // GET: Filtrar eventos por fecha usando el campo `event_date`
                const { date } = queryStringParameters;
                result = await pool.query(`
                    SELECT * FROM t_events WHERE event_date = $1
                `, [date]);
            } else if (queryStringParameters.event_id) {
                // GET: Filtrar evento por `event_id`
                const { event_id } = queryStringParameters;
                result = await pool.query(`
                    SELECT * FROM t_events WHERE event_id = $1
                `, [event_id]);
            } else if (queryStringParameters.approved) {
                // GET: Filtrar eventos aprobados o desaprobados
                const approved = queryStringParameters.approved === 'true';
                result = await pool.query(`
                    SELECT * FROM t_events WHERE approved = $1
                `, [approved]);

                // Verificar si el resultado está vacío y devolver una advertencia
                if (result.rows.length === 0) {
                    return {
                        statusCode: 200,
                        body: JSON.stringify({ message: `No hay eventos ${approved ? 'aprobados' : 'desaprobados'}.` })
                    };
                }
            }
        } else if (httpMethod === 'PUT' && body) {
            // PUT: Aprobar o rechazar un evento en base al `event_id` y el estado `approved`
            const { event_id, approved } = JSON.parse(body);

            if (event_id && typeof approved === 'boolean') {
                result = await pool.query(`
                    UPDATE t_events SET approved = $1 WHERE event_id = $2 RETURNING *
                `, [approved, event_id]);
            } else {
                throw new Error("Datos inválidos para la solicitud PUT");
            }
        }

        // Retornar la respuesta con los datos obtenidos o actualizados
        return {
            statusCode: 200,
            body: JSON.stringify(result.rows),
        };
    } catch (error) {
        console.error('Error al ejecutar la función Lambda:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error interno del servidor' }),
        };
    }
};
