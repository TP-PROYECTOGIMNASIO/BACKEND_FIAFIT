import pkg from 'pg';
const { Pool } = pkg;

// RESPONSABLE: Paolo Diaz 
//HISTORIA DE USUARIO: 34 - Generar plan de nutricion 
// DESCRIPCION: Guarda el plan de nutricion por dia
// PATH: /api/plan-de-nutricion/hu-tp-34
// METHODS: POST

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
    console.log(event);
    const path = event.path;
    const queryParams = event.queryStringParameters;

    // Método POST para insertar datos en `t_diet_plans` y `t_diet_plan_days`
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

        // Se extraen los datos del body
        const { diet_plan_id, client_id, name_plan, start_date, end_date, protein_gr, carbohydrates_gr, daily_calories_kcal, days } = body;

        // Validación de los datos de entrada
        if (!client_id || !days || !Array.isArray(days)) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({ error: 'Faltan datos obligatorios: client_id y days.' }),
            };
        }

        try {
            // Iniciar la transacción
            await pool.query('BEGIN');

            let newDietPlanId;

            // Si no se recibe `diet_plan_id`, insertar un nuevo plan de dieta
            if (!diet_plan_id || diet_plan_id === '') {
                const insertDietPlanQuery = `
                INSERT INTO t_diet_plans (client_id, name_plan, start_date, end_date, protein_gr, carbohydrates_gr, daily_calories_kcal, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING diet_plan_id;
                `;
                const dietPlanValues = [
                    client_id,
                    name_plan,
                    start_date,
                    end_date,
                    protein_gr,
                    carbohydrates_gr,
                    daily_calories_kcal,
                    new Date().toISOString(),
                    new Date().toISOString()
                ];
                const dietPlanResult = await pool.query(insertDietPlanQuery, dietPlanValues);
                newDietPlanId = dietPlanResult.rows[0].diet_plan_id;
            } else {
                newDietPlanId = diet_plan_id;
            }

            // Insertar los días en la tabla `t_diet_plan_days`
            const insertPlanDayQuery = `
                INSERT INTO t_diet_plan_days (diet_plan_id, day_number, breakfast, lunch, dinner, notes, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING diet_plan_day_id;
            `;

            for (const day of days) {
                const planDayValues = [
                    newDietPlanId,
                    day.day_number,       // Número del día
                    day.breakfast || "",   // Desayuno
                    day.lunch || "",       // Almuerzo
                    day.dinner || "",      // Cena
                    day.notes || "",       // Notas
                    new Date().toISOString(),  // created_at
                    new Date().toISOString()   // updated_at
                ];
                const planDayResult = await pool.query(insertPlanDayQuery, planDayValues);
                day.diet_plan_day_id = planDayResult.rows[0].diet_plan_day_id; // Agregar el ID del día al objeto day
            }

            // Confirmar la transacción
            await pool.query('COMMIT');

            // Construir el JSON con los datos insertados
            const dietPlanJSON = {
                diet_plan_id: newDietPlanId,
                client_id: client_id,
                name_plan: name_plan,
                start_date: start_date,
                end_date: end_date,
                protein_gr: protein_gr,
                carbohydrates_gr: carbohydrates_gr,
                daily_calories_kcal: daily_calories_kcal,
                days: days // Incluir los días con sus respectivos IDs
            };

            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({ message: "Datos registrados correctamente", diet_plan_id: dietPlanJSON.diet_plan_id }),
            };
        } catch (err) {
            // En caso de error, hacer rollback de la transacción
            await pool.query('ROLLBACK');
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
};
