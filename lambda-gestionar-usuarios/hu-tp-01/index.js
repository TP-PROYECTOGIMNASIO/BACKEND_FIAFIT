import AWS from 'aws-sdk';

AWS.config.update({ region: 'us-east-2' });

const cognito = new AWS.CognitoIdentityServiceProvider();

export const handler = async (event) => {
    const { httpMethod } = event;

    try {
        let response;
        
        if (httpMethod === 'PUT') {
            response = await confirmEmail(event);
        } else if (httpMethod === 'POST') {
            response = await login(event);
        } else {
            response = {
                statusCode: 405,
                headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
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
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
            body: JSON.stringify({ message: 'Error interno del servidor', error: error.message }),
        };
    }
};

async function createUser(username, mail, password) {
    try {
        // Parámetros para la creación del usuario
        const params = {
            ClientId: '7ekmlnhikbq4alfs8859rs4cp4', // Reemplaza con tu App Client ID
            Username: username,
            Password: password,
            UserAttributes: [
                {
                    Name: 'email',
                    Value: mail,
                },
                {
                    Name: 'nickname', // Agregar el atributo obligatorio "nickName"
                    Value: username,
                }
            ]
        };

        // Registrar el usuario en el User Pool
        // const result = await cognito.signUp(params).promise();

        return {
            statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
            body: JSON.stringify({ message: 'Usuario registrado con éxito. Se ha enviado un correo de verificación.' }),
        };
    } catch (error) {
        return {
            statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
            body: JSON.stringify({ message: 'Error al registrar el usuario', error: error.message }),
        };
    }
}

async function confirmEmail(event) {
    try {
        // Extraer datos del cuerpo del evento
        const { username, confirmationCode } = JSON.parse(event.body);

        // Parámetros para confirmar el registro del usuario
        const params = {
            ClientId: '7ekmlnhikbq4alfs8859rs4cp4', // Reemplaza con tu App Client ID
            Username: username,
            ConfirmationCode: confirmationCode,
        };

        // Confirmar el registro del usuario en el User Pool
        await cognito.confirmSignUp(params).promise();

        return {
            statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
            body: JSON.stringify({ message: 'Correo verificado con éxito.' }),
        };
    } catch (error) {
        return {
            statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
            body: JSON.stringify({ message: 'Error al verificar el correo', error: error.message }),
        };
    }
}

async function login(event) {
    // Aquí puedes implementar la lógica de inicio de sesión
    try {
        const { username, password } = JSON.parse(event.body);

        const params = {
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: '7ekmlnhikbq4alfs8859rs4cp4', // Reemplaza con tu App Client ID
            AuthParameters: {
                USERNAME: username,
                PASSWORD: password,
            },
        };

        const result = await cognito.initiateAuth(params).promise();

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
            },
            body: JSON.stringify({
                message: 'Login exitoso.',
                idToken: result.AuthenticationResult.IdToken,
                accessToken: result.AuthenticationResult.AccessToken,
                refreshToken: result.AuthenticationResult.RefreshToken,
            }),
        };
    } catch (error) {
        return {
            statusCode: 400,
            headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
            body: JSON.stringify({ message: 'Error al iniciar sesión', error: error.message }),
        };
    }
}
