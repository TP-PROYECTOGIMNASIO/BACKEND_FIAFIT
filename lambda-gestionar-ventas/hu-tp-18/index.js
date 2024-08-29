import AWS from 'aws-sdk';

AWS.config.update({ region: 'us-east-2' });

const cognito = new AWS.CognitoIdentityServiceProvider();

export const handler = async (event) => {
    // Asegúrate de que solo se acepten solicitudes POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            body: JSON.stringify({ success: false, message: 'Método no permitido' }),
        };
    }

    // Extrae los datos de la solicitud
    const { token, email, amount } = JSON.parse(event.body);

    // Configura los datos que se enviarán a la API de Culqi
    const postData = JSON.stringify({
        amount: amount, // Monto en centavos (ej. 1000 = 10.00 PEN)
        currency_code: 'PEN',
        email: email,
        source_id: token
    });

    const options = {
        hostname: 'api.culqi.com',
        path: '/v2/charges',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer sk_test_0df6274e07cec4fb', // Reemplaza con tu llave privada
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    try {
        // Envía la solicitud a Culqi
        const paymentResponse = await new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        data: data
                    });
                });
            });

            req.on('error', (e) => {
                reject(e);
            });

            req.write(postData);
            req.end();
        });

        const parsedPaymentResponse = JSON.parse(paymentResponse.data);

        // Verifica si el pago fue exitoso
        if (paymentResponse.statusCode !== 201) {
            return {
                statusCode: paymentResponse.statusCode,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST'
                },
                body: JSON.stringify({ success: false, message: parsedPaymentResponse.user_message || 'Error en la solicitud' }),
            };
        }

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            body: JSON.stringify({ success: true, message: 'Pago procesado exitosamente' }),
        };

    } catch (error) {
        console.error('Error en la solicitud:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            body: JSON.stringify({ success: false, message: 'Error en la solicitud' }),
        };
    }
};