import pkg from 'pg';
const { Client } = pkg;

export const handler = async (event) => {
    const method = event.httpMethod;
    let requestBody;

    // Obtener el cuerpo de la solicitud o los parámetros en caso de GET
    if (method === 'POST') {
        if (!event.body) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
                },
                body: JSON.stringify({ message: 'El cuerpo de la solicitud no puede estar vacío' }),
            };
        }
        requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else if (method === 'GET') {
        requestBody = event.queryStringParameters || {};
    } else {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
            },
            body: JSON.stringify({ message: 'Método no permitido' }),
        };
    }

    const client = new Client({
        host: 'dpg-crq80452ng1s73e3ueu0-a.oregon-postgres.render.com',
        port: 5432,
        user: 'fia_fit_user',
        password: 'VKEqqYetj5RXA1Eit0zizGWvoMfw4Opq',
        database: 'fia_fit_db',
        ssl: {
            rejectUnauthorized: false,
        },
    });

    await client.connect();

    const { client_id, day } = requestBody;  // Obtener el client_id del cliente y el día

    try {
        // 1. Obtener el plan de entrenamiento del cliente basado en t_plan_days
        const planQuery = `
            SELECT 
                plan_day_id, 
                training_plan_id, 
                day, 
                focus
            FROM 
                t_plan_days
            WHERE 
                training_plan_id = $1
                AND day = $2;
        `;
        const resPlan = await client.query(planQuery, [client_id, day]);

        if (resPlan.rows.length === 0) {
            return {
                statusCode: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
                },
                body: JSON.stringify({ message: 'No se encontró ningún día de entrenamiento para el día especificado.' }),
            };
        }

        const trainingPlan = {
            training_plan_id: resPlan.rows[0].training_plan_id,
            plan_day_id: resPlan.rows[0].plan_day_id,
            day: convertirDiaSemana(resPlan.rows[0].day), // Convertir el número del día en el nombre del día
            focus: resPlan.rows[0].focus,
            exercises: []
        };

        // 2. Obtener los ejercicios para ese día
        const exercisesQuery = `
            SELECT 
                de.exercise_id, 
                de.sets, 
                de.reps
            FROM 
                t_day_exercises de
            WHERE 
                de.plan_day_id = $1;
        `;
        const resExercises = await client.query(exercisesQuery, [trainingPlan.plan_day_id]);

        // Añadir los ejercicios al día correspondiente
        resExercises.rows.forEach(exercise => {
            trainingPlan.exercises.push({
                exercise_id: exercise.exercise_id,
                sets: exercise.sets,
                reps: exercise.reps
            });
        });

        // Devolver la respuesta del plan de entrenamiento filtrado por el día
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
            },
            body: JSON.stringify({ training_plan: trainingPlan })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
            },
            body: JSON.stringify({ message: 'Error al obtener el plan de entrenamiento', error: error.message })
        };
    } finally {
        await client.end();
    }
};

// Función para convertir números de día a nombres de día
function convertirDiaSemana(diaNumero) {
    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return diasSemana[diaNumero - 1]; // restamos 1 porque el array empieza en 0
}
