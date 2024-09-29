import pkg from 'pg';
const { Client } = pkg;

// Configuración del cliente para conectarse a la base de datos PostgreSQL

export const handler = async (event) => {
    const client = new Client({
      user: 'fia_fit_user',
      host: 'dpg-crq80452ng1s73e3ueu0-a.oregon-postgres.render.com',
      database: 'fia_fit_db',
      password: 'VKEqqYetj5RXA1Eit0zizGWvoMfw4Opq',
      port: 5432,
      ssl: {
        rejectUnauthorized: false // Solo en desarrollo. En producción, configura esto correctamente.
      }
});
    // Obtener clientId y otros parámetros de la consulta o body
    const { clientId, planId, diaId } = event.queryStringParameters || {};
    try {
        // Conectar a la base de datos una sola vez
        await client.connect();

        let res;
        // Caso 1: Mostrar solo el plan de entrenamiento
        if (clientId) {
            res = await client.query(`
                SELECT training_plan_id, name, description 
                FROM t_training_plans
                WHERE client_id = $1
            `, [clientId]);

        // Caso 2: Mostrar los días de un plan de entrenamiento
        } else if (planId) {
            res = await client.query(`
                SELECT training_plan_id, day, focus 
                FROM t_plan_days
                WHERE training_plan_id = $1;
            `, [planId]);

        // Caso 3: Mostrar los ejercicios de un día específico
        } else if (diaId) {
            res = await client.query(`
                SELECT dex.day_exercise_id, dex.plan_day_id, dex.sets, dex.reps, ex.name AS exercise_name
                FROM t_day_exercises AS dex
                INNER JOIN t_exercises AS ex ON dex.exercise_id = ex.exercise_id
                WHERE dex.plan_day_id = $1;
            `, [diaId]);
        }
        
        await client.end();
        // Devolver el resultado de la consulta
        return {
            statusCode: 200, // OK
            headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
            body: JSON.stringify(res.rows), // Devolver el resultado en formato JSON
        };

    } catch (err) {
        console.error('Error ejecutando la consulta', err); // Imprime el error en los logs
        return {
            statusCode: 500, // Internal Server Error
            headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
            body: JSON.stringify({
                message: "Error interno del servidor",
                error: err.message // Incluir el mensaje de error en la respuesta
            }),
        };
    } finally {
        // Cerrar la conexión a la base de datos
        await client.end();
    }
};

