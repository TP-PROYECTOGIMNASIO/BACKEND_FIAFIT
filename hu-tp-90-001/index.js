import pkg from 'pg';
const { Client } = pkg;

//RESPONSABLE:JORGE LOPEZ
//HISTORIA DE USUARIO:90 - PLAN DE TRATAMIENTO - VISTA DETALLE
//DESCRIPCION: LISTA EL DETALLE DEL PLAN DE TRATAMIENTO FILTRADO POR CLIENTE
//PATH: /plan-de-tratamiento/hu-tp-90
//METHODS: GET

export const handler = async (event) => {
    console.log(event);
    const { httpMethod } = event;
    const queryParams = event.queryStringParameters || {};  // Obtener los parámetros de la URL
    console.log(httpMethod);
    
    if (httpMethod != 'GET') {
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
        ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    try {
        // Verifica si se proporciona el `clientId`
        if (!queryParams.clientId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'El parámetro clientId es obligatorio.' }),
            };
        }

        const clientId = queryParams.clientId;
        const view = queryParams.view || 'last_plan';

        // Obtener el último plan de tratamiento del cliente (view: last_plan)
        if (view === 'last_plan') {
            const lastPlanResult = await client.query(
                'SELECT * FROM t_treatment_plans WHERE client_id = $1 ORDER BY treatment_plan_id DESC LIMIT 1',
                [clientId]
            );
            const lastPlan = lastPlanResult.rows[0];

            if (!lastPlan) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ message: 'No se encontró ningún plan de tratamiento para el cliente.' }),
                };
            }

            // Obtener las sesiones del último plan de tratamiento
            const sessionsResult = await client.query(
                'SELECT * FROM t_treatment_plan_sessions WHERE treatment_plan_id = $1',
                [lastPlan.treatment_plan_id]
            );
            const sessions = sessionsResult.rows;

            // Agregar detalles de cada sesión con sus ejercicios
            for (const session of sessions) {
                const exerciseResult = await client.query(
                    'SELECT * FROM t_treatment_exercises WHERE treatment_exercise_id = $1',
                    [session.treatment_exercise_id]
                );
                session.exercise = exerciseResult.rows[0];

                if (session.exercise) {
                    const exerciseTypeResult = await client.query(
                        'SELECT * FROM t_treatment_exercise_types WHERE treatment_exercise_type_id = $1',
                        [session.exercise.treatment_exercise_type_id]
                    );
                    session.exercise.type = exerciseTypeResult.rows[0];
                }
            }

            // Devolver el último plan con las sesiones detalladas
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
                },
                body: JSON.stringify({ ...lastPlan, sessions: sessions }),
            };
        }

        // Obtener todos los planes anteriores (excepto el último) (view: all_previous_plans)
        if (view === 'all_previous_plans') {
            const allPlansResult = await client.query(
                'SELECT * FROM t_treatment_plans WHERE client_id = $1 ORDER BY treatment_plan_id DESC OFFSET 1',
                [clientId]
            );
            const allPlans = allPlansResult.rows;

            if (allPlans.length === 0) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ message: 'No hay planes de tratamiento anteriores para el cliente.' }),
                };
            }

            // Obtener las sesiones y detalles de cada plan anterior
            for (const plan of allPlans) {
                const sessionsResult = await client.query(
                    'SELECT * FROM t_treatment_plan_sessions WHERE treatment_plan_id = $1',
                    [plan.treatment_plan_id]
                );
                const sessions = sessionsResult.rows;

                for (const session of sessions) {
                    const exerciseResult = await client.query(
                        'SELECT * FROM t_treatment_exercises WHERE treatment_exercise_id = $1',
                        [session.treatment_exercise_id]
                    );
                    session.exercise = exerciseResult.rows[0];

                    if (session.exercise) {
                        const exerciseTypeResult = await client.query(
                            'SELECT * FROM t_treatment_exercise_types WHERE treatment_exercise_type_id = $1',
                            [session.exercise.treatment_exercise_type_id]
                        );
                        session.exercise.type = exerciseTypeResult.rows[0];
                    }
                }

                plan.sessions = sessions;
            }

            // Devolver todos los planes anteriores con sus detalles
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
                },
                body: JSON.stringify(allPlans),
            };
        }

        // Si la vista especificada no es válida
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'La vista especificada no es válida.' }),
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
            },
            body: JSON.stringify({ error: error.message }),
        };
    } finally {
        await client.end();
    }
};
