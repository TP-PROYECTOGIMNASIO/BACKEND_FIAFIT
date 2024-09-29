import pkg from 'pg';

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
    const { httpMethod, body, queryStringParameters } = event;

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
        if (doc) {
            return await findUserByDni(doc);
        } else {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Debe enviar el parámetro de consulta "document". Ejemplo: ?document=12345678' }),
            };
        }
    } 
    
    if (httpMethod === 'PATCH') {
        // Intentar parsear el cuerpo de la solicitud
        let parsedBody;
        try {
            parsedBody = JSON.parse(body);
        } catch (error) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'El formato del JSON enviado no es válido', error: error.message }),
            };
        }

        const { client_id, staff_id } = parsedBody;
        
        if (!client_id || !staff_id) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Debe enviar los campos client_id y staff_id.' }),
            };
        }

        // Llamar a la función para asignar el cliente al staff
        return await assignClientToTrainer(client_id, staff_id);
    }

    // Método no permitido
    return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ message: 'Método no permitido' }),
    };
};

// Función que busca un usuario por su documento
async function findUserByDni(doc) {
    const table = 't_clients';

    try {
        // Consulta SQL utilizando parámetros seguros
        const query = `
            SELECT 
                client_id,
                names,
                father_last_name,
                mother_last_name,
                document
            FROM ${table}
            WHERE document = $1
        `;

        const res = await pool.query(query, [doc]);

        if (res.rowCount === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'El usuario no existe' }),
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(res.rows),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal server error', error: error.message }),
        };
    }
}

// Función que asigna un cliente a un entrenador
async function assignClientToTrainer(client_id, staff_id) {
    const table_name = 't_clients';

    try {
        // Asigna el staff con id staff_id al cliente con id client_id
        const updateQuery = `UPDATE ${table_name} SET staff_id = $1 WHERE client_id = $2`;
        const result = await pool.query(updateQuery, [staff_id, client_id]);

        // Verificamos que se haya realizado el cambio
        if (result.rowCount === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    message: `No se encontró un cliente con el id ${client_id} o no se realizó ningún cambio.`,
                }),
            };
        }

        // Retorna respuesta que el cambio fue realizado
        return {
            statusCode: 202,
            headers,
            body: JSON.stringify({
                message: `Staff member ${staff_id} ha sido asignado al cliente con id ${client_id}.`,
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'An error occurred while processing your request.', error: error.message }),
        };
    }
}