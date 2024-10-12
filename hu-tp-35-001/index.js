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
    const clientTable = 't_clients';

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
                country
            FROM ${clientTable}
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

        const responseBody = {
            client: {
                id: client.client_id,
                names: client.names,
                father_last_name: client.father_last_name,
                mother_last_name: client.mother_last_name,
                document: client.document,
                image_url: client.image_url, // URL de la imagen del cliente
                mail: client.mail,
                phone_number: client.phone_number,
                address: client.address,
                city: client.city,
                country: client.country
            }
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
    const clientTable = 't_clients';
    const bodyMetricsTable = 't_body_metrics';

    try {
        // Buscar el cliente por DNI
        const clientQuery = `
            SELECT 
                client_id,
                names,
                father_last_name,
                mother_last_name,
                document,
                image_url
            FROM ${clientTable}
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
                imc
            FROM ${bodyMetricsTable}
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

// Función que busca clientes por tipo de membresía
async function findClientsByMembership(membershipId) {
    const clientMembershipTable = 't_client_memberships';
    const clientTable = 't_clients';

    try {
        // Consulta para obtener los clientes que tienen una membresía específica
        const membershipQuery = `
            SELECT 
                c.client_id,
                c.names,
                c.father_last_name,
                c.mother_last_name,
                c.document,
                cm.membership_id,
                cm.membership_start_date,
                cm.payment_frequency_months
            FROM ${clientMembershipTable} cm
            JOIN ${clientTable} c ON cm.client_id = c.client_id
            WHERE cm.membership_id = $1
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
    const clientTable = 't_clients';

    try {
        // Consulta para obtener todos los clientes
        const allUsersQuery = `
            SELECT 
                client_id,
                names,
                father_last_name,
                mother_last_name,
                document,
                image_url
            FROM ${clientTable}
        `;
        const result = await pool.query(allUsersQuery);

        if (result.rowCount === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'No se encontraron clientes' }),
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