import pkg from 'pg';

// Configuración de la conexión a PostgreSQL
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

// Nombre de la tabla de la base de datos
const table_name = "t_memberships";

// Definir los encabezados CORS una vez para reutilizarlos
const headers = {
  'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
  'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
};

export const handler = async (event) => {
    
    const { httpMethod, body } = event;
    
    // Verifica si el método HTTP es POST
    if (httpMethod === 'POST') {
        const { name, price, description } = JSON.parse(body);

        // Si no se envió ningún dato, devuelve un error
        if (!name || !description || !price) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Debe enviar los campos de name, price y description' }),
            };
        }

        try {
            // Consulta SQL para insertar una nueva membresía
            const query = `
                INSERT INTO ${table_name} (name, price, description, active)
                VALUES ($1, $2, $3, true)
                RETURNING *;
            `;
            const values = [name, price, description];

            // Ejecución de la consulta
            const res = await pool.query(query, values);

            // Respuesta de éxito con los datos de la membresía
            return {
                statusCode: 201,
                headers,
                body: JSON.stringify(res.rows[0]),
            };

        } catch (err) {
            // Manejo de errores en la consulta a la base de datos
            console.error('Error al insertar la membresía:', err);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Error al insertar la membresía', details: err.message }),
            };
        }
    } else if(httpMethod === 'GET' ) {
        console.log(event)
        const { queryStringParameters } = event;
        if(queryStringParameters != null) {
            
            const membership_id = queryStringParameters?.membership_id
            
            if(membership_id == undefined || membership_id == null || membership_id == '') {
               return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({error: 'Debe enviar un membership_id valido'}),
                }; 
            }
            
            const query = `SELECT * FROM ${table_name} WHERE membership_id = $1;`;
            const values = [membership_id];
            const res = await pool.query(query, values);
            
            if(res.rowCount === 1) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(res.rows[0]),
                };
            } else {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: `No se encontro ninguna membresia con el id ${membership_id}` }),
                };
            }
        } else {
            const query = `SELECT * FROM ${table_name}`;
            const res = await pool.query(query);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(res.rows),
            };
        }

    } else {
        // Respuesta para métodos HTTP no permitidos
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ message: 'Método no permitido' }),
        };
    }
};