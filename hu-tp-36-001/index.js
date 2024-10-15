import pkg from 'pg';
const { Client } = pkg;


//RESPONSABLE:JORGE LOPEZ
//HISTORIA DE USUARIO:36 - PLAN DE NUTRICION - VISTA NUTRICIONISTA
//DESCRIPCION: LISTA EL DETALLE DEL PLAN DE NUTRICION
//PATH: /plan-de-nutricion/hu-tp-36
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
        // Si se proporciona dietPlanId en los parámetros de consulta, se obtiene ese plan en específico
        if (queryParams.dietPlanId) {
            const dietPlanId = queryParams.dietPlanId;

            // Obtener el plan de dieta por dietPlanId
            const dietPlanResult = await client.query('SELECT * FROM t_diet_plans WHERE diet_plan_id = $1', [dietPlanId]);
            const dietPlan = dietPlanResult.rows[0];

            if (!dietPlan) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ message: 'No se encontró ningún plan de nutrición con ese ID.' }),
                };
            }

            // Obtener los días correspondientes al plan
            const dietPlanDaysResult = await client.query('SELECT * FROM t_diet_plan_days WHERE diet_plan_id = $1', [dietPlan.diet_plan_id]);
            const dietPlanDays = dietPlanDaysResult.rows;

            // Retornar el plan y los días
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
                },
                body: JSON.stringify({ ...dietPlan, days: dietPlanDays }),
            };
        }

        // Si el parámetro showAll=true está presente, obtenemos todos los planes anteriores menos el más reciente
        if (queryParams.showAll && queryParams.showAll === 'true') {
            const allDietPlansResult = await client.query('SELECT * FROM t_diet_plans ORDER BY created_at DESC OFFSET 1');
            const allDietPlans = allDietPlansResult.rows;

            if (allDietPlans.length === 0) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ message: 'No hay planes de nutrición anteriores.' }),
                };
            }

            // Retornar todos los planes anteriores
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
                },
                body: JSON.stringify(allDietPlans),
            };
        } else {
            // Obtener el último plan de nutrición
            const lastDietPlanResult = await client.query('SELECT * FROM t_diet_plans ORDER BY diet_assignment_date DESC LIMIT 1');
            const lastDietPlan = lastDietPlanResult.rows[0];

            if (!lastDietPlan) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ message: 'No se encontró ningún plan de nutrición.' }),
                };
            }

            // Obtener los días del último plan
            const dietPlanDaysResult = await client.query('SELECT * FROM t_diet_plan_days WHERE diet_plan_id = $1', [lastDietPlan.diet_plan_id]);
            const dietPlanDays = dietPlanDaysResult.rows;

            // Retornar el último plan y los días correspondientes
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
                },
                body: JSON.stringify({ ...lastDietPlan, days: dietPlanDays }),
            };
        }

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
