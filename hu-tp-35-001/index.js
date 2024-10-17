import pkg from 'pg';

//************************************************************************************************/
//******************************************COMENTARIOS******************************************/
// RESPONSABLE: Karla Moquillaza Velasco
// HISTORIA DE USUARIO: 35 - Visualizar lista de clientes nutricionistas
// DESCRIPCIÓN: Busqueda por DNI, filtrar a los clientes según su membresia, Mostrar plan nustricionista
// PATH: /hu-tp-35
// METHODS: GET
//************************************************************************************************/

// Configuración de la conexión al pool de PostgreSQL
const pool = new pkg.Pool({
  user: 'fia_fit_user',
  host: 'dpg-crq80452ng1s73e3ueu0-a.oregon-postgres.render.com',
  database: 'fia_fit_db',
  password: 'VKEqqYetj5RXA1Eit0zizGWvoMfw4Opq',
  port: 5432,
  ssl: {
    rejectUnauthorized: false // Solo en desarrollo. En producción, configura esto correctamente.
  }
});

const headers = {
    'Access-Control-Allow-Origin': '*', // Permitir solicitudes desde cualquier origen
    'Access-Control-Allow-Headers': 'Content-Type', // Permitir ciertos encabezados
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,PATCH', // Permitir ciertos métodos HTTP
};


const clientTable = 't_clients';
const clietMembershipsTable = 't_client_memberships'
const dietPlansTable = 't_diet_plans'
const membershipsTable = 't_memberships'
const gendersTable = 't_genders'
const bodyMetricsTable = 't_body_metrics';
const goalsTable = 't_goals'

// Función principal manejadora del evento
export const handler = async (event) => {
    const { httpMethod, queryStringParameters } = event;

    if (httpMethod === 'OPTIONS') {
        // Responder a la verificación CORS
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight check successful' }),
        };
    } 
    
    if (httpMethod === 'GET') {
        const doc = queryStringParameters?.document;
        const clientId = queryStringParameters?.client_id;
        const membershipId = queryStringParameters?.membership_id;

        if (doc) {
            // Buscar por DNI y mostrar cliente y métricas corporales
            return await findUserAndLatestBodyMetricsByDni(doc);
        } else if (clientId) {
            // Buscar por client_id y mostrar detalles del cliente
            return await findClientById(clientId);
        } else if (membershipId) {
            // Buscar por membresía
            return await findClientsByMembership(membershipId);
        } else {
            // Si no se envía el DNI, client_id o membership_id, mostrar lista de todos los clientes
            return await listAllUsers();
        }
    }

    // Método no permitido
    return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ message: 'Método no permitido' }),
    };
};

// Función que busca un cliente por su client_id
async function findClientById(clientId) {

    try {
        // Consulta para buscar el cliente por su client_id
        const clientQuery = `
            SELECT 
                client_id,
                names,
                father_last_name,
                mother_last_name,
                document,
                image_url,
                mail,
                phone_number,
                address,
                city,
                country,
                E.gender
            FROM ${clientTable} as A
            left join ${gendersTable} as E
            on E.gender_id = A.gender_id
            WHERE client_id = $1
        `;
        const clientResult = await pool.query(clientQuery, [clientId]);

        if (clientResult.rowCount === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'CLIENTE NO ENCONTRADO' }),
            };
        }

        // Obtener los detalles del cliente
        const client = clientResult.rows[0];

        const bodyMetricsQuery = `
            SELECT 
                body_metric_id,
                metric_date,
                height,
                weight,
                chest_cm,
                waist_cm,
                hip_cm,
                arm_cm,
                thigh_cm,
                shoulder_cm,
                ideal_weight,
                imc,
                B.name as goals
            FROM ${bodyMetricsTable} as A
            left join ${goalsTable} as B
            on A.goal_id = B.goal_id 
            WHERE client_id = $1
            ORDER BY metric_date DESC
            LIMIT 1
        `;
        
        const bodyMetricsResult = await pool.query(bodyMetricsQuery, [clientId]);

        const responseBody = {
            client: client,
            body_metrics: bodyMetricsResult.rowCount > 0 ? bodyMetricsResult.rows[0] : 'No hay métricas corporales disponibles para este cliente'
        };

        return {    
            statusCode: 200,
            headers,
            body: JSON.stringify(responseBody),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal server error', error: error.message }),
        };
    }
}

// Función que busca un usuario por su documento (DNI) y muestra sus últimas métricas corporales
async function findUserAndLatestBodyMetricsByDni(doc) {

    try {
        // Buscar el cliente por DNI
        const clientQuery = `
            SELECT 
                client_id,
                names,
                father_last_name,
                mother_last_name,
                document,
                image_url,
                E.gender
            FROM ${clientTable}
            left join ${gendersTable} as E
            on E.gender_id = B.gender_id
            WHERE document = $1
        `;
        const clientResult = await pool.query(clientQuery, [doc]);

        if (clientResult.rowCount === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'CLIENTE NO ENCONTRADO' }),
            };
        }

        // Si el cliente existe, obtener su última métrica corporal
        const client = clientResult.rows[0];
        const clientId = client.client_id;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(responseBody),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal server error', error: error.message }),
        };
    }
}

// Función que busca clientes por tipo de membresía
async function findClientsByMembership(membershipId) {

    try {
        // Consulta para obtener los clientes que tienen una membresía específica
        const membershipQuery = `
            select
            A.client_id,
            CONCAT(B.names,' ',B.father_last_name,' ',B.mother_last_name) as names,
            E.gender,
            B.document,
            A.membership_id,
            C.name as membership_name,
            D.start_date,
            D.end_date,
                CASE 
                    WHEN D.end_date IS NULL THEN 'No Generado'
                    WHEN CURRENT_TIMESTAMP > D.end_date THEN 'Vencido'
                    WHEN CURRENT_TIMESTAMP BETWEEN D.start_date AND D.end_date THEN 'Vigente'
                END AS plan_diet_status
            from ${clietMembershipsTable} as A
            inner join ${clientTable} as B
            on B.client_id = A.client_id
            inner join ${membershipsTable} as C
            on A.membership_id = C.membership_id
            left join ${dietPlansTable} as D
            on A.client_id = D.client_id
            left join ${gendersTable} as E
            on E.gender_id = B.gender_id 
            where C.name in ('Black', 'Premium')
            and C.membership_id = $1 
        `;
        const result = await pool.query(membershipQuery, [membershipId]);

        if (result.rowCount === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'No se encontraron clientes con esta membresía' }),
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result.rows),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal server error', error: error.message }),
        };
    }
}

// Función que lista todos los usuarios (clientes)
async function listAllUsers() {

    try {
        // Consulta para obtener todos los clientes
        const allUsersQuery = `
            select
            A.client_id,
            CONCAT(B.names,' ',B.father_last_name,' ',B.mother_last_name) as names,
            E.gender,
            B.document,
            A.membership_id,
            C.name as membership_name,
            D.start_date,
            D.end_date,
                CASE 
                    WHEN D.end_date IS NULL THEN 'No Generado'
                    WHEN CURRENT_DATE > D.end_date THEN 'Vencido'
                    WHEN CURRENT_DATE BETWEEN D.start_date AND D.end_date THEN 'Vigente'
                END AS plan_diet_status
            from ${clietMembershipsTable} as A
            inner join ${clientTable} as B
            on B.client_id = A.client_id
            inner join ${membershipsTable} as C
            on A.membership_id = C.membership_id
            left join ${dietPlansTable} as D
            on A.client_id = D.client_id
            left join ${gendersTable} as E
            on E.gender_id = B.gender_id
            where C.name in ('Black', 'Premium')
        `;
        const users = await pool.query(allUsersQuery);

        if (users.rowCount === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'No se encontraron clientes' }),
            };
        }
        
        const allMembershipsQuery = `
            SELECT 
                membership_id,
                name
            FROM ${membershipsTable}
            WHERE name IN ('Black', 'Premium')
        `;
        const memberships = await pool.query(allMembershipsQuery);

        console.log(memberships.rows)

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ users: users.rows, memberships: memberships.rows}),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal server error', error: error.message }),
        };
    }
}

    
    
