import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  user: 'fia_fit_user',
  host: 'dpg-crq80452ng1s73e3ueu0-a.oregon-postgres.render.com',
  database: 'fia_fit_db',
  password: 'VKEqqYetj5RXA1Eit0zizGWvoMfw4Opq',
  port: 5432,
  ssl: {
    rejectUnauthorized: false // Solo en desarrollo. En producción, configura esto correctamente.
  }
});

export const handler = async (event) => {
    try {
        // Conecta con la base de datos si no está conectado
        if (!client._connected) {
            await client.connect();
        }
	console.log(event)
        // Datos recibidos del evento (por ejemplo, un JSON)
        const { method, id, name, description} = JSON.parse(event.body);

        // Inserta un nuevo tipo de producto en la tabla t_product_types
        if (method === 'create') {
        const query = `
                INSERT INTO t_product_types (product_type_name, description,created_at, updated_at)
                VALUES ($1, $2, now(), now())
                RETURNING *;
            `;
            const values = [name, description];
            const res = await client.query(query, values);
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({
                    message: 'Tipo de producto registrado con éxito',
                    productType: res.rows[0]
                }),
            };

        // Obtener todos los tipos de productos
        } else if (method === 'read') {
            const query = `SELECT * FROM t_product_types`; 
            const values = id ? [id] : [];
            const res = await client.query(query, values);
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({
                    message: id ? 'Producto obtenido con éxito' : 'Productos obtenidos con éxito',
                    productTypes: res.rows
                }),
            };

        // Actualizar un tipo de producto
        } else if (method === 'update') {
            const query = `
                UPDATE t_product_types 
                SET product_type_name = $1, description = $2
                WHERE product_type_id = $3
                RETURNING *;
            `;
            const values = [name, description, id];
            const res = await client.query(query, values);

            if (res.rowCount === 0) {
                return {
                    statusCode: 404,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                    },
                    body: JSON.stringify({
                        message: 'No se encontró el tipo de producto con el ID proporcionado'
                    }),
                };
            }

            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({
                    message: 'Tipo de producto actualizado con éxito',
                    updatedProductType: res.rows[0]
                }),
            };

        // Eliminar un tipo de producto
        } else if (method === 'delete') {
        const query = `
                DELETE FROM t_product_types 
                WHERE product_type_id = $1
                RETURNING *;
            `;
            const values = [id];
            const res = await client.query(query, values);

            if (res.rowCount === 0) {
                return {
                    statusCode: 404,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                    },
                    body: JSON.stringify({
                        message: 'No se encontró el tipo de producto con el ID proporcionado'
                    }),
                };
            }

            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({
                    message: 'Tipo de producto eliminado con éxito',
                    deletedProductType: res.rows[0]
                }),
            };

        } else {
            // Si se envía un método no soportado
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({
                    message: 'Método no soportado'
                }),
            };
        }

    } catch (err) {
        // Manejo de errores
        console.error('Error al procesar la solicitud:', err.stack);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
            },
            body: JSON.stringify({
                message: 'Error al procesar la solicitud',
                error: err.message
            }),
        };
    }
    // No cierras la conexión aquí si planeas reutilizarla.
    // Si quieres cerrarla, quita el if anterior y usa esto:
    // await client.end();
}