import pkg from 'pg';
const { Pool } = pkg; // Ajuste para módulos CommonJS
import AWS from 'aws-sdk';

//RESPONSABLE: SHIRLEY TOMPSON
//HISTORIA DE USUARIO: 38 - GENERAR PLAN DE TRATAMIENTO
//DESCRIPCION: CREAR LOS PLANES DE TRATAMIENTO PARA CLIENTES PREMIUN O BLACK
//PATH: api/clientes/HU-TP-38
//METHODS: POST

const pool = new Pool({
    host: 'dpg-crq80452ng1s73e3ueu0-a.oregon-postgres.render.com', // Host
    port: 5432,
    user: 'fia_fit_user', // Usuario
    password: 'VKEqqYetj5RXA1Eit0zizGWvoMfw4Opq', // Contraseña
    database: 'fia_fit_db', // Base de datos
    ssl: {
        rejectUnauthorized: false // Solo en desarrollo
    }
});

const handler = async (event) => {
    const { client_id, diagnosis, instructions } = JSON.parse(event.body);

    if (!client_id || !diagnosis || !instructions) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Faltan datos: client_id, diagnosis o instructions.' })
        };
    }

    const createdAt = new Date().toISOString(); // Fecha y hora actual
    const updatedAt = createdAt;

    const query = `
        INSERT INTO t_treatment_plans (client_id, diagnosis, instructions, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING treatment_plan_id;
    `;

    try {
        const client = await pool.connect();
        const res = await client.query(query, [client_id, diagnosis, instructions, createdAt, updatedAt]);
        const treatment_plan_id = res.rows[0].treatment_plan_id;

        client.release();

        return {
            statusCode: 201,
            body: JSON.stringify({ message: 'Plan de tratamiento creado con éxito', treatment_plan_id })
        };
    } catch (error) {
        console.error('Error al crear el plan de tratamiento:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error interno del servidor' })
        };
    }
};

export { handler };  // Exportación correcta para Lambda
