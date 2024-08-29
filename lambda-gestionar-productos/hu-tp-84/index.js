import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  user: 'db_gym_render_user',
  host: 'dpg-cr5568ij1k6c73934m10-a.oregon-postgres.render.com',
  database: 'db_gym_render',
  password: 'LusVdIcmARRFj7nY76BbOj9MzQ2Y33I5',
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
        const { product_name, description } = JSON.parse(event.body);

        // Inserta un nuevo tipo de producto en la tabla t_product_types
        const query = `
            INSERT INTO t_product_types (product_name, description,created_at, updated_at)
            VALUES ($1, $2,NOW(), NOW())
            RETURNING *;
        `;
        const values = [product_name, description];
        const res = await client.query(query, values);

        // Respuesta exitosa
        return {
            statusCode: 200,
            headers: {
            'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
            'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
            },
            body: JSON.stringify({
                message: 'Tipo de producto registrado con éxito',
                productType: res.rows[0]
            }),
        };
    } catch (err) {
        // Manejo de errores
        console.error('Error al registrar el tipo de producto:', err.stack);
        return {
            statusCode: 500,
            headers: {
            'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
            'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
            },
            body: JSON.stringify({
                message: 'Error al registrar el tipo de producto',
                error: err.message
            }),
        };
    }
    // No cierras la conexión aquí si planeas reutilizarla.
    // Si quieres cerrarla, quita el if anterior y usa esto:
    // await client.end();
}
