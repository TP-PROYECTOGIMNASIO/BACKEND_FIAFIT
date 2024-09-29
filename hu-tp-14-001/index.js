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

export const handler = async (event) => {
    try {
        // Parsear los datos del encabezado
        const { queryStringParameters } = event
        
        if (queryStringParameters != undefined || queryStringParameters != null) {
        
            const client_id = queryStringParameters?.client_id;
            const month = queryStringParameters?.month;
            
            // Consultar métricas corporales para el usuario y mes especificados
            const query = `
                SELECT  * 
                FROM t_body_metrics 
                WHERE client_id = $1 AND EXTRACT(MONTH FROM created_at) = $2`;
            const values = [client_id, month];
            const res = await pool.query(query, values);
    
            if (res.rows.length === 0) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({
                        message: 'No se encontraron métricas corporales para el usuario y mes especificados',
                    }),
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json',
                    }
                };
            }
    
            const { height, weight } = res.rows[0];
    
            // Calcular el IMC
            const imc = weight / Math.pow(height / 100, 2);
    
            // Calcular el objetivo de IMC
            const targetIMC = 25;
    
            // Crear la respuesta
            let message;
            if (imc < targetIMC) {
                message = `Tu IMC es ${imc.toFixed(1)}, lo que indica que estás en un rango de peso saludable para tu altura. ¡Sigue así!`;
            } else if (imc >= targetIMC && imc < 30) {
                message = `Tu IMC es ${imc.toFixed(1)}, lo que indica que debes tener cuidado con tu peso. ¡Trabaja en ello!`;
            } else {
                message = `Tu IMC es ${imc.toFixed(1)}, lo que indica que estás en un rango de peso no saludable para tu altura. ¡Debes tomar medidas!`;
            }
    
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: message,
                    imc: imc,
                    metrics: res.rows[0]
                }),
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                }
            };
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Debe ingresar mediante parametros el client_id y month. Ejemplo month (1 = enero, 12 = diciembre"
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            }
        };
    } catch (err) {
        console.error('Error al consultar métricas corporales', err);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error al consultar las métricas corporales',
                error: err.message,
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            }
        };
    }
};