import pkg from 'pg'
 
const pool = new pkg.Pool({
    user: 'db_gym_render_user',
    host: 'dpg-cr5568ij1k6c73934m10-a.oregon-postgres.render.com',
    database: 'db_gym_render',
    password: 'LusVdIcmARRFj7nY76BbOj9MzQ2Y33I5',
    port: 5432,
    ssl: {
    rejectUnauthorized: false // Solo en desarrollo. En producción, configura esto correctamente.
  }
})
 
const table_name = "t_users_tmp"
const column_id = "user_id"
 
export const handler = async (event) => {
        const id = event.queryStringParameters?.user_id
        //  const estado = event.queryStringParameters?.estado
        const query = `UPDATE ${table_name} SET status = TRUE WHERE ${column_id} = $1`
        const res = await pool.query(query, [id]);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: `User ${id} enabled successfully.`}),
        };
};