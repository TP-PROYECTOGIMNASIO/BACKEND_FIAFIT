import AWS from 'aws-sdk';
import pkg from 'pg';

//CONTACTO: NIVARDO CANO
// RESPONSABLE: CAROLINE RUIZ
//HISTORIA DE USUARIO: 41 - VISUALIZAR LISTA DE CLIENTES COMO FISIOTERAPEUTA
//DESCRIPCION: Visualizar la lista de clientes
//PATH: api/clientes/HU-TP-41
//METHODS: GET

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
const membershipsTable = 't_memberships';
const clientMembershipsTable = 't_client_memberships';
const treatmentPlansTable = 't_treatment_plans';

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
            // Buscar por DNI y mostrar cliente
            return await findUserByDni(doc);
        } else if (clientId) {
            // Buscar por client_id y mostrar detalles del cliente
            return await findClientById(clientId);
        } else if (membershipId) {
            // Buscar clientes por membresía
            return await findClientsByMembership(membershipId);
        } else {
            // Mostrar la lista completa de clientes Black y Premium
            return await listAllUsersAndMemberships();
        }
    }

    // Método no permitido
    return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ message: 'Método no permitido' }),
    };
};

// Función para listar todos los clientes Black y Premium y también las membresías disponibles
async function listAllUsersAndMemberships() {
    try {
        // Consulta para listar todos los clientes Black y Premium
        const allUsersQuery = `
            SELECT A.client_id, A.membership_id, B.names, B.document, C.name
            FROM ${clientMembershipsTable} as A
            INNER JOIN ${clientTable} as B
            ON A.client_id = B.client_id
            INNER JOIN ${membershipsTable} as C
            ON A.membership_id = C.membership_id
            WHERE C.name IN ('Black', 'Premium')
        `;
        
        // Consulta para listar las membresías Black y Premium
        const membershipsQuery = `
            SELECT membership_id, name 
            FROM ${membershipsTable}
            WHERE name IN ('Black', 'Premium')
        `;

        // Ejecutar ambas consultas de forma simultánea
        const [usersResult, membershipsResult] = await Promise.all([
            pool.query(allUsersQuery),
            pool.query(membershipsQuery)
        ]);

        if (usersResult.rowCount === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'No se encontraron clientes con membresías Black o Premium' }),
            };
        }

        if (membershipsResult.rowCount === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'No se encontraron membresías Black o Premium' }),
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                users: usersResult.rows,
                memberships: membershipsResult.rows
            }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal server error', error: error.message }),
        };
    }
}

// Función para buscar cliente por DNI
async function findUserByDni(doc) {
    try {
        const userQuery = `
            SELECT A.client_id, A.membership_id, B.names, B.document, C.name
            FROM ${clientMembershipsTable} as A
            INNER JOIN ${clientTable} as B
            ON A.client_id = B.client_id
            INNER JOIN ${membershipsTable} as C
            ON A.membership_id = C.membership_id
            WHERE C.name IN ('Black', 'Premium')
            AND B.document = $1
        `;
        const result = await pool.query(userQuery, [doc]);

        if (result.rowCount === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'CLIENTE NO ENCONTRADO' }),
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

// Función para obtener detalles del cliente, incluyendo el plan de tratamiento
async function findClientById(clientId) {
    try {
        const clientQuery = `
            SELECT D.treatment_plan_id, A.client_id, A.membership_id, B.names, B.country, B.document, C.name
            FROM ${clientMembershipsTable} as A
            INNER JOIN ${clientTable} as B
            ON A.client_id = B.client_id
            INNER JOIN ${membershipsTable} as C
            ON A.membership_id = C.membership_id
            LEFT JOIN ${treatmentPlansTable} as D
            ON A.client_id = D.client_id
            WHERE C.name IN ('Black', 'Premium')
            AND A.client_id = $1
        `;
        const result = await pool.query(clientQuery, [clientId]);

        if (result.rowCount === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'CLIENTE NO ENCONTRADO' }),
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

// Función para buscar clientes por tipo de membresía
async function findClientsByMembership(membershipId) {
    try {
        const membershipQuery = `
            SELECT A.client_id, A.membership_id, B.names, B.document, C.name
            FROM ${clientMembershipsTable} as A
            INNER JOIN ${clientTable} as B
            ON A.client_id = B.client_id
            INNER JOIN ${membershipsTable} as C
            ON A.membership_id = C.membership_id
            WHERE C.name IN ('Black', 'Premium')
            AND C.membership_id = $1
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