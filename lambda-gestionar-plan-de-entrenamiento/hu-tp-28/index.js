import pkg from 'pg';
const { Client } = pkg;

// Configuración del cliente para conectarse a la base de datos PostgreSQL
const client = new Client({
    host: 'dpg-cr5568ij1k6c73934m10-a.oregon-postgres.render.com',
    database: 'db_gym_render',
    user: 'db_gym_render_user',
    password: 'LusVdIcmARRFj7nY76BbOj9MzQ2Y33I5',
    port: 5432,
    ssl: {
        rejectUnauthorized: true  // Asegúrate de verificar el certificado en producción
    }
});


// Función Lambda para manejar la solicitud
export const handler = async (event) => {
    // Verificar si el método es GET
    if (event.httpMethod === 'GET') {
        try {
            await client.connect();
            
            // Obtener el historial del plan de entrenamiento por día
            const query = `
                SELECT pd.plan_day_id, pd.training_plan_id, pd.day, pd.focus, pd.created_at, pd.updated_at,
                       ex.exercise_id, ex.sets, ex.reps
                FROM t_plan_days pd
                JOIN t_day_exercises ex ON pd.plan_day_id = ex.plan_day_id
                ORDER BY pd.day;
            `;
            const result = await client.query(query);

            await client.end();

            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify(result.rows),
            };
        } catch (err) {
            console.error('Error al obtener los datos:', err.message);

            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({ error: 'Ocurrió un error al obtener los datos', details: err.message }),
            };
        }
    }

    // Parsear el cuerpo de la solicitud para el método POST
    let body;
    try {
        body = JSON.parse(event.body);
    } catch (err) {
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
            },
            body: JSON.stringify({ error: 'El cuerpo de la solicitud no es válido JSON.' }),
        };
    }

    const { training_plan_id, day, focus, exercises } = body;

    // Validación de los datos de entrada
    if (!training_plan_id || !day || !focus || !Array.isArray(exercises)) {
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
            },
            body: JSON.stringify({ error: 'Faltan datos obligatorios: training_plan_id, day, focus, exercises.' }),
        };
    }

    try {
        await client.connect();
        
        // Iniciar una transacción
        await client.query('BEGIN');

        // Insertar en la tabla t_plan_days
        const insertPlanDayQuery = `
            INSERT INTO t_plan_days (training_plan_id, day, focus, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING plan_day_id;
        `;
        const planDayValues = [
            training_plan_id,
            day,
            focus,
            new Date().toISOString(),  // created_at
            new Date().toISOString()   // updated_at
        ];

        const planDayResult = await client.query(insertPlanDayQuery, planDayValues);
        const newPlanDayId = planDayResult.rows[0].plan_day_id;

        // Insertar los ejercicios en t_day_exercises
        const insertExerciseQuery = `
            INSERT INTO t_day_exercises (plan_day_id, exercise_id, sets, reps, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING day_exercise_id;
        `;

        for (const exercise of exercises) {
            const exerciseValues = [
                newPlanDayId,
                exercise.exercise_id,
                exercise.sets,
                exercise.reps,
                new Date().toISOString(),  // created_at
                new Date().toISOString()   // updated_at
            ];
            await client.query(insertExerciseQuery, exerciseValues);
        }

        // Confirmar la transacción
        await client.query('COMMIT');

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
            },
            body: JSON.stringify({ message: "Datos registrados correctamente", plan_day_id: newPlanDayId }),
        };
    } catch (err) {
        // Revertir la transacción en caso de error
        await client.query('ROLLBACK');

        console.error('Error al registrar los datos:', err.message);
        
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
            },
            body: JSON.stringify({ error: 'Ocurrió un error al registrar los datos', details: err.message }),
        };
    } finally {
        await client.end();
    }
    
};

