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
    rejectUnauthorized: false // Solo en desarrollo. En producción, configura esto correctamente.
  }
});



// Función Lambda para manejar la solicitud
export const handler = async (event) => {
    console.log(event)
    const path = event.path; // Obtener el path para identificar la solicitud específica
    const queryParams = event.queryStringParameters; // Obtener los parámetros de consulta (para GETs)
    
    // Método POST para insertar un plan de entrenamiento y ejercicios
    if (event.httpMethod === 'POST') {
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

            const planDayResult = await pool.query(insertPlanDayQuery, planDayValues);
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
                await pool.query(insertExerciseQuery, exerciseValues);
            }

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
        }
    }

    // Método GET para obtener los tipos de ejercicio para el ComboBox
    if (event.httpMethod === 'GET' && queryParams != null && queryParams.exerciseTypes == "1") {
        console.log("getExerciseTypes")
        try {
            const query = `
                SELECT exercise_type_id, name 
                FROM t_exercise_types
                ORDER BY name;
            `;
            const result = await pool.query(query);

            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify(result.rows), // Enviamos el ID y nombre del tipo de ejercicio
            };
        } catch (err) {
            console.error('Error al obtener los tipos de ejercicio:', err.message);

            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({ error: 'Ocurrió un error al obtener los tipos de ejercicio', details: err.message }),
            };
        }
    }
    
    if (event.httpMethod === 'GET' && queryParams.exercise_type_id != null ) {
        const { exercise_type_id } = queryParams; // Tomar el parámetro de consulta `exercise_type_id`

        // Verificar si el parámetro está presente
        if (!exercise_type_id) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({ error: 'Falta el parámetro obligatorio: exercise_type_id' }),
            };
        }

        try {
            // Consulta para obtener los ejercicios filtrados por `exercise_type_id`
            const query = `
                SELECT *
                FROM t_exercises
                WHERE exercise_type_id = $1
                ORDER BY name;
            `;
            const result = await pool.query(query, [exercise_type_id]);

            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify(result.rows), // Enviar los ejercicios filtrados
            };
        } catch (err) {
            console.error('Error al obtener los ejercicios por tipo:', err.message);

            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({ error: 'Ocurrió un error al obtener los ejercicios', details: err.message }),
            };
        }
    }
    
    // Método GET para obtener ejercicios filtrados por tipo
    if (event.httpMethod === 'GET') {

        // Verificar si el parámetro está presente

        try {
            // Consulta para obtener los ejercicios filtrados por `exercise_type_id`
            const query = `
                SELECT *
                FROM t_exercises
            `;
            const result = await pool.query(query);

            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify(result.rows), // Enviar los ejercicios filtrados
            };
        } catch (err) {
            console.error('Error al obtener los ejercicios por tipo:', err.message);

            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({ error: 'Ocurrió un error al obtener los ejercicios', details: err.message }),
            };
        }
    }
    
};

