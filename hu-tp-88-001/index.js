import AWS from 'aws-sdk';
import pkg from 'pg';

const pool = new pkg.Pool({
        host: 'dpg-crq80452ng1s73e3ueu0-a.oregon-postgres.render.com', // Nuevo host
        port: 5432,
        user: 'fia_fit_user', // Nuevo usuario
        password: 'VKEqqYetj5RXA1Eit0zizGWvoMfw4Opq', // Nueva contraseña
        database: 'fia_fit_db', // Nueva base de datos
        ssl: {
            rejectUnauthorized: false // Solo en desarrollo. En producción, configura esto correctamente.
        }
});

// Inicializar el servicio de Cognito Identity Provider
AWS.config.update({ region: 'us-east-2' });

const cognito = new AWS.CognitoIdentityServiceProvider();

export const handler = async (event) => {
    const { httpMethod } = event;
    console.log('HTTP Method:', httpMethod); // Log para verificar el método

    try {
        let response;
        if (httpMethod === 'PUT') {
            console.log('Método PUT recibido');
            // Actualizar contraseña
            response = await updatePassword(event);
        } else if (httpMethod === 'POST') {
            console.log('Método POST recibido');
            // Iniciar sesión
            response = await login(event);
        } else {
            console.log(`Método ${httpMethod} no permitido`);
            response = {
                statusCode: 405,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({ message: 'Método no permitido' }),
            };
        }

        return response;
    } catch (error) {
        console.error('Error interno del servidor:', error); // Log del error
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
            },
            body: JSON.stringify({ message: 'Error interno del servidor', error: error.message }),
        };
    }
};

// Función para actualizar la contraseña
async function updatePassword(event) {
    try {
        const { username, newPassword } = JSON.parse(event.body);
        console.log('Actualizando contraseña para:', username);

        const params = {
            UserPoolId: 'us-east-2_kbbQNOdqg', // User Pool ID
            Username: username,
            Password: newPassword,
            Permanent: true  // Hacer la contraseña permanente
        };

        // Actualizar la contraseña
        await cognito.adminSetUserPassword(params).promise();
        console.log('Contraseña actualizada correctamente para:', username);
        
        const query ="UPDATE public.t_users SET password=$1, updated_at=NOW() WHERE \"user\"=$2"
        await pool.query(query, [newPassword, username])
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
            },
            body: JSON.stringify({ message: 'Contraseña actualizada correctamente' }),
        };
    } catch (error) {
        console.error('Error al actualizar la contraseña:', error);
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
            },
            body: JSON.stringify({ message: 'Error al actualizar la contraseña', error: error.message }),
        };
    }
}

// Función para iniciar sesión
async function login(event) {
    try {
        const { username, password } = JSON.parse(event.body);
        console.log('Iniciando sesión para:', username);

        const params = {
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: '7ekmlnhikbq4alfs8859rs4cp4', // Reemplaza con tu App Client ID
            AuthParameters: {
                USERNAME: username,
                PASSWORD: password,
            },
        };

        const result = await cognito.initiateAuth(params).promise();
        console.log('Resultado de login para:', username, result);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
            },
            body: JSON.stringify({
                message: 'Login exitoso.',
                idToken: result.AuthenticationResult.IdToken,
                accessToken: result.AuthenticationResult.AccessToken,
                refreshToken: result.AuthenticationResult.RefreshToken,
            }),
        };
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
            },
            body: JSON.stringify({ message: 'Error al iniciar sesión', error: error.message }),
        };
    }
}