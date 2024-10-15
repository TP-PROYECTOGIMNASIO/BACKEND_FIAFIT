import pkg from 'pg';
//
const { Pool } = pkg;

// RESPONSABLE: ELISBAN ANDERSON MAMANI JARA
// HISTORIA DE USUARIO:13 - VISUALIZAR PLAN DE NUTRICION COMO CLIENTE
// DESCRIPCION: VISUALIZAR SOLO EL ULTIMO PLAN DE NUTRICION SEGUN EL CLIENTE
// PATH: /plan-de-nutricion/hu-tp-13
// METHODS: GET

// 1. Cuando el front de click al boton para ver plan de nutricion, vas a mostrar solo el ULTIMO PLAN DE TRATAMIENTO segun el id del usuario

const pool = new Pool({
    host: 'dpg-crq80452ng1s73e3ueu0-a.oregon-postgres.render.com',
    port: 5432,
    user: 'fia_fit_user',
    password: 'VKEqqYetj5RXA1Eit0zizGWvoMfw4Opq',
    database: 'fia_fit_db',
    ssl: { rejectUnauthorized: false },
});

export const handler = async (event) => {
    console.log(event);
    const { httpMethod } = event;
    const queryParams = event.queryStringParameters || {};  
    console.log(httpMethod);

    if (httpMethod !== 'GET') {
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

    try {
        // Obtener el clientId
        const clientId = queryParams.clientId;

        if (!clientId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'El parámetro clientId es requerido.' }),
            };
        }

        
        const client = await pool.connect();

        try {
            // Obtener el último plan de tratamiento del cliente
            const lastDietPlanResult = await client.query(
                'SELECT * FROM t_diet_plans WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1', 
                [clientId]
            );
            const lastDietPlan = lastDietPlanResult.rows[0];

            if (!lastDietPlan) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ message: 'Usted no cuenta con un plan de nutrición.' }),
                };
            }

            // Obtener los días correspondientes al último plan de nutrición
            const dietPlanDaysResult = await client.query(
                'SELECT * FROM t_diet_plan_days WHERE diet_plan_id = $1', 
                [lastDietPlan.diet_plan_id]
            );
            const dietPlanDays = dietPlanDaysResult.rows;

            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
                },
                body: JSON.stringify({ ...lastDietPlan, days: dietPlanDays }),
            };

        } finally {
            
            client.release();
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
    }
};
