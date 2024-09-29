import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    user: 'fia_fit_user',
    host: 'dpg-crq80452ng1s73e3ueu0-a.oregon-postgres.render.com',
    database: 'fia_fit_db',
    password: 'VKEqqYetj5RXA1Eit0zizGWvoMfw4Opq',
    port: 5432,
    ssl: {
        rejectUnauthorized: false // Solo en desarrollo. En producción, configura esto correctamente.
    }
});

// Encabezados CORS
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Content-Type': 'application/json',
};

// Handler para listar alumnos
export const listarAlumnos = async () => {
    try {
        const query = 'SELECT client_id, names, father_last_name, mother_last_name FROM t_clients';
        const res = await pool.query(query);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Lista de alumnos obtenida exitosamente',
                alumnos: res.rows,
            }),
            headers,
        };
    } catch (err) {
        console.error('Error al obtener la lista de alumnos', err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error al obtener la lista de alumnos',
                error: err.message,
            }),
            headers,
        };
    }
};

// Handler para registrar métricas
export const registrarMetricas = async (event) => {
    try {
        const body = JSON.parse(event.body);
        const { client_id, height, weight, chest_cm, waist_cm, hip_cm, arm_cm, thigh_cm, shoulder_cm, goal_id, ideal_weight, imc } = body;

        if (!client_id || !height || !weight) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Faltan datos obligatorios: client_id, height o weight',
                }),
                headers,
            };
        }

        const now = new Date().toISOString();

        const query = `
            INSERT INTO t_body_metrics 
            (client_id, height, weight, chest_cm, waist_cm, hip_cm, arm_cm, thigh_cm, shoulder_cm, goal_id, ideal_weight, imc, created_at, updated_at) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
            RETURNING *`;
        const values = [client_id, height, weight, chest_cm, waist_cm, hip_cm, arm_cm, thigh_cm, shoulder_cm, goal_id, ideal_weight, imc, now, now];
        const res = await pool.query(query, values);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Métricas corporales registradas correctamente',
                bodyMetrics: res.rows[0],
            }),
            headers,
        };
    } catch (err) {
        console.error('Error al registrar métricas corporales', err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error al registrar las métricas corporales',
                error: err.message,
            }),
            headers,
        };
    }
};

// Handler para actualizar métricas
export const actualizarMetricas = async (event) => {
    try {
        const body = JSON.parse(event.body);
        const { client_id, height, weight, chest_cm, waist_cm, hip_cm, arm_cm, thigh_cm, shoulder_cm, goal_id, ideal_weight, imc } = body;

        if (!client_id || !height || !weight) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Faltan datos obligatorios: client_id, height o weight',
                }),
                headers,
            };
        }

        const now = new Date().toISOString();

        const query = `
            UPDATE t_body_metrics 
            SET height = $2, weight = $3, chest_cm = $4, waist_cm = $5, hip_cm = $6, arm_cm = $7, thigh_cm = $8, shoulder_cm = $9, 
                goal_id = $10, ideal_weight = $11, imc = $12, updated_at = $13 
            WHERE client_id = $1 
            RETURNING *`;
        const values = [client_id, height, weight, chest_cm, waist_cm, hip_cm, arm_cm, thigh_cm, shoulder_cm, goal_id, ideal_weight, imc, now];
        const res = await pool.query(query, values);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Métricas corporales actualizadas correctamente',
                bodyMetrics: res.rows[0],
            }),
            headers,
        };
    } catch (err) {
        console.error('Error al actualizar métricas corporales', err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error al actualizar las métricas corporales',
                error: err.message,
            }),
            headers,
        };
    }
};

// Handler para ver historial de métricas
export const historialMetricas = async (event) => {
    try {
        const { client_id } = event.queryStringParameters;

        if (!client_id) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Falta el client_id en los parámetros de consulta',
                }),
                headers,
            };
        }

        const query = `
            SELECT * FROM t_body_metrics 
            WHERE client_id = $1 
            ORDER BY created_at DESC`;
        const values = [client_id];
        const res = await pool.query(query, values);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Historial de métricas obtenido exitosamente',
                historial: res.rows,
            }),
            headers,
        };
    } catch (err) {
        console.error('Error al obtener el historial de métricas', err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error al obtener el historial de métricas',
                error: err.message,
            }),
            headers,
        };
    }
};

// Función de enrutamiento para Lambda
export const handler = async (event) => {
    const { httpMethod, path } = event;

    // Define la ruta base
    const basePath = '/api/metricas-alumno/hu-tp-22';

    if (httpMethod === 'GET' && path === `${basePath}/listarAlumnos`) {
        return listarAlumnos();
    } else if (httpMethod === 'POST' && path === `${basePath}/registrarMetricas`) {
        return registrarMetricas(event);
    } else if (httpMethod === 'PUT' && path === `${basePath}/actualizarMetricas`) {
        return actualizarMetricas(event);
    } else if (httpMethod === 'GET' && path === `${basePath}/historialMetricas`) {
        return historialMetricas(event);
    } else if (httpMethod === 'OPTIONS') {
        // Respuesta para preflight requests de CORS
        return {
            statusCode: 204,
            headers,
        };
    } else {
        return {
            statusCode: 404,
            body: JSON.stringify({
                message: 'Ruta no encontrada',
            }),
            headers,
        };
    }
};
