import AWS from 'aws-sdk';

AWS.config.update({ region: 'us-east-2' });

const cognito = new AWS.CognitoIdentityServiceProvider();

export const handler = async (event) => {
    const { httpMethod } = event;

    try {
        let response;

        if (httpMethod === 'PATCH') {
            response = await initiatePasswordReset(event);
        } else if (httpMethod === 'PUT') {
            response = await confirmPasswordReset(event);
        } else {
            response = {
                statusCode: 405,
                headers: {
                        'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                        'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                        'Access-Control-Allow-Methods': 'OPTIONS,PATCH,PUT' // Permitir ciertos métodos HTTP
                },
                body: JSON.stringify({ message: 'Método no permitido' }),
            };
        }

        return response;
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                'Access-Control-Allow-Methods': 'OPTIONS,PATCH,PUT' // Permitir ciertos métodos HTTP
            },
            body: JSON.stringify({ message: 'Error interno del servidor', error: error.message }),
        };
    }
};

// Función para iniciar el proceso de recuperación de contraseña
async function initiatePasswordReset(event) {
    try {
        const { username } = JSON.parse(event.body);

        const params = {
            ClientId: '7ekmlnhikbq4alfs8859rs4cp4', // Reemplaza con tu App Client ID
            Username: username,
        };
        await cognito.forgotPassword(params).promise();

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                'Access-Control-Allow-Methods': 'OPTIONS,PATCH,PUT' // Permitir ciertos métodos HTTP
            },
            body: JSON.stringify({ message: 'Código de verificación enviado para restablecer la contraseña.' }),
        };
    } catch (error) {
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                'Access-Control-Allow-Methods': 'OPTIONS,PATCH,PUT' // Permitir ciertos métodos HTTP
            },
            body: JSON.stringify({ message: 'Error al iniciar el proceso de recuperación de contraseña', error: error.message }),
        };
    }
}

// Función para confirmar el código de verificación y establecer una nueva contraseña
async function confirmPasswordReset(event) {
    try {
        const { username, confirmationCode, newPassword } = JSON.parse(event.body);

        const params = {
            ClientId: '7ekmlnhikbq4alfs8859rs4cp4', // Reemplaza con tu App Client ID
            Username: username,
            ConfirmationCode: confirmationCode,
            Password: newPassword,
        };

        await cognito.confirmForgotPassword(params).promise();

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                'Access-Control-Allow-Methods': 'OPTIONS,PATCH,PUT' // Permitir ciertos métodos HTTP
            },
            body: JSON.stringify({ message: 'Contraseña restablecida con éxito.' }),
        };
    } catch (error) {
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                'Access-Control-Allow-Methods': 'OPTIONS,PATCH,PUT' // Permitir ciertos métodos HTTP
            },
            body: JSON.stringify({ message: 'Error al restablecer la contraseña', error: error.message }),
 };
}
}