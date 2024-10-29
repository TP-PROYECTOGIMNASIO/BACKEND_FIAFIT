import pkg from 'pg'; // Importa el paquete de PostgreSQL
import AWS from 'aws-sdk'; // Importa el SDK de AWS (si es necesario)

// RESPONSABLE: Aythor Herlin 
// HISTORIA DE USUARIO: 30 - VISUALIZAR PLAN DE TRATAMIENTO
// DESCRIPCIÓN: Visualizar y gestionar planes de tratamiento para clientes con membresía Black o Premium
// PATH: https://3zn8rhvzul.execute-api.us-east-2.amazonaws.com/api/plan-de-tratamiento/HU-TP-39
// MÉTODOS SOPORTADOS: GET
// 1. public.t_clients: Información personal de los clientes.
// 2. public.t_client_memberships: Relaciona a los clientes con sus membresías.
// 3. public.t_memberships: Información sobre los tipos de membresía (ej. Black, Premium).
// 4. public.t_treatment_plans: Detalles de los planes de tratamiento asignados a los clientes.
// 5. public.t_treatment_plan_sessions: Sesiones de los planes de tratamiento.
// 6. public.t_genders: Información del género del cliente.

// Destructura el cliente de PostgreSQL
const { Client } = pkg;

export async function handler(event) {
  // Configuración del cliente de PostgreSQL con los detalles de conexión
  const client = new Client({
    host: 'dpg-crq80452ng1s73e3ueu0-a.oregon-postgres.render.com', // Host de la base de datos
    port: 5432, // Puerto de conexión
    user: 'fia_fit_user', // Usuario de la base de datos
    password: 'VKEqqYetj5RXA1Eit0zizGWvoMfw4Opq', // Contraseña del usuario
    database: 'fia_fit_db', // Nombre de la base de datos
    ssl: {
      rejectUnauthorized: false, // Configuración SSL para aceptar conexiones no autenticadas
    },
  });

  try {
    // Conectar al cliente de PostgreSQL
    await client.connect();

    // Obtener los parámetros de consulta de la solicitud (client_id y month)
    const { client_id, month, membership_type } = event.queryStringParameters || {};

    // 1. Listar clientes con membresía Black o Premium si no se proporciona un client_id
    if (event.httpMethod === 'GET' && !client_id) {
      let membershipCondition = '';
      // Si se proporciona un tipo de membresía en los parámetros, se filtra por eso.
      // ESTE BLOQUE SE DESACTIVA COMENTÁNDOLO PARA NO FILTRAR POR BLACK O PREMIUM---------------------
      /*

      if (membership_type) {
        membershipCondition = `AND m.name = '${membership_type}'`;
      }

      const query = `
        SELECT c.client_id, c.names, c.father_last_name, c.mother_last_name, 
               m.name AS membership_name, 
               DATE_PART('year', AGE(c.birth_date)) AS age -- Calcular la edad
        FROM public.t_clients c
        INNER JOIN public.t_client_memberships cm ON c.client_id = cm.client_id
        INNER JOIN public.t_memberships m ON cm.membership_id = m.membership_id
        WHERE m.name IN ('Black', 'Premium') ${membershipCondition};
      `; // Consulta para obtener los clientes con membresía Black o Premium, con opción de filtrar por membresía específica
      const result = await client.query(query);
      return {
        statusCode: 200, // Respuesta exitosa
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
        },
        body: JSON.stringify({
          message: 'Lista de clientes obtenida exitosamente.',
          clients: result.rows, // Lista de clientes obtenida
        }),
      };
      */
    }

    // 2. Visualizar detalles del plan de tratamiento de un cliente específico, incluyendo su género y edad
    if (event.httpMethod === 'GET' && client_id && !month) {
      const query = `
        SELECT tp.treatment_plan_id, tp.diagnosis, tp.instructions, 
               tps.sessions_number, tps.treatment_exercise_id, -- Cambio de 'activity' a 'treatment_exercise_id'
               tps.session_date, tps.session_time, g.gender,
               DATE_PART('year', AGE(c.birth_date)) AS age -- Calcular la edad
        FROM public.t_treatment_plans tp
        LEFT JOIN public.t_treatment_plan_sessions tps ON tp.treatment_plan_id = tps.treatment_plan_id
        LEFT JOIN public.t_clients c ON tp.client_id = c.client_id
        LEFT JOIN public.t_genders g ON c.gender_id = g.gender_id
        WHERE tp.client_id = $1;
      `; // Consulta para obtener el plan de tratamiento del cliente, incluyendo el género y edad
      const result = await client.query(query, [client_id]);

      return {
        statusCode: 200, // Respuesta exitosa
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
        },
        body: JSON.stringify({
          message: 'Plan de tratamiento, edad y género obtenidos exitosamente.',
          treatmentPlan: result.rows, // Detalles del plan de tratamiento del cliente junto con el género y la edad
        }),
      };
    }

    // 3. Visualizar el plan de tratamiento más reciente del cliente
    if (event.httpMethod === 'GET' && client_id && !month) {
      const query = `
        SELECT tp.treatment_plan_id, tp.diagnosis, tp.instructions, 
               tps.sessions_number, tps.treatment_exercise_id, -- Cambio de 'activity' a 'treatment_exercise_id'
               tps.session_date, tps.session_time, g.gender,
               DATE_PART('year', AGE(c.birth_date)) AS age -- Calcular la edad
        FROM public.t_treatment_plans tp
        LEFT JOIN public.t_treatment_plan_sessions tps ON tp.treatment_plan_id = tps.treatment_plan_id
        LEFT JOIN public.t_clients c ON tp.client_id = c.client_id
        LEFT JOIN public.t_genders g ON c.gender_id = g.gender_id
        WHERE tp.client_id = $1
        ORDER BY tp.treatment_assignment_date DESC
        LIMIT 1;
      `; // Consulta para obtener el plan de tratamiento más reciente del cliente junto con su género y edad
      const result = await client.query(query, [client_id]);

      return {
        statusCode: 200, // Respuesta exitosa
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
        },
        body: JSON.stringify({
          message: 'Plan de tratamiento más reciente, edad y género obtenidos exitosamente.',
          treatmentPlan: result.rows, // Detalles del plan de tratamiento más reciente
        }),
      };
    }

    // 4. Visualizar planes de tratamiento de meses anteriores
    if (event.httpMethod === 'GET' && client_id && month) {
      const query = `
        SELECT tp.treatment_plan_id, tp.diagnosis, tp.instructions, 
               tps.sessions_number, tps.treatment_exercise_id, -- Cambio de 'activity' a 'treatment_exercise_id'
               tps.session_date, tps.session_time, g.gender,
               DATE_PART('year', AGE(c.birth_date)) AS age -- Calcular la edad
        FROM public.t_treatment_plans tp
        LEFT JOIN public.t_treatment_plan_sessions tps ON tp.treatment_plan_id = tps.treatment_plan_id
        LEFT JOIN public.t_clients c ON tp.client_id = c.client_id
        LEFT JOIN public.t_genders g ON c.gender_id = g.gender_id
        WHERE tp.client_id = $1
        AND EXTRACT(MONTH FROM tp.treatment_assignment_date) = $2;
      `; // Consulta para obtener los planes de tratamiento anteriores junto con el género y edad
      const result = await client.query(query, [client_id, month]);

      if (result.rows.length === 0) {
        return {
          statusCode: 200, // Respuesta exitosa pero sin planes disponibles
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
          },
          body: JSON.stringify({
            message: 'No hay planes de tratamiento en el mes seleccionado.',
          }),
        };
      }

      return {
        statusCode: 200, // Respuesta exitosa
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
        },
        body: JSON.stringify({
          message: 'Planes de tratamiento anteriores obtenidos exitosamente.',
          treatmentPlans: result.rows, // Lista de planes de tratamiento obtenidos
        }),
      };
    }

    // Si no se cumple ninguna condición, se retorna un error de solicitud incorrecta
    return {
      statusCode: 400, // Solicitud incorrecta
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
      },
      body: JSON.stringify({ error: 'Solicitud incorrecta. Revisa los parámetros de consulta.' }),
    };
  } catch (err) {
    // Manejo de errores generales
    console.error('Error en la función Lambda:', err.message);
    return {
      statusCode: 500, // Error interno del servidor
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
      },
      body: JSON.stringify({ error: `Error interno del servidor: ${err.message}` }),
    };
  } finally {
    // Cerrar la conexión al cliente de PostgreSQL
    await client.end();
  }
}
