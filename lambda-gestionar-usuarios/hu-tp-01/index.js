import AWS from 'aws-sdk';

AWS.config.update({ region: 'us-east-2' });

const cognito = new AWS.CognitoIdentityServiceProvider();

export const handler = async (event) => {
    const { httpMethod } = event;

    try {
        let response;

        if (httpMethod === 'POST') {
            response = await createUser(event);
        } else if (httpMethod === 'PUT') {
            response = await confirmEmail(event);
        } else if (httpMethod === 'GET') {
            response = await login(event);
        } else {
            response = {
                statusCode: 405,
                body: JSON.stringify({ message: 'Método no permitido' }),
            };
        }

        return response;
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error interno del servidor', error: error.message }),
        };
    }
};

async function createUser(event) {
    try {
        // Extraer datos del cuerpo del evento
        const { username, email, password } = JSON.parse(event.body);

        // Parámetros para la creación del usuario
        const params = {
            ClientId: '3vtti4k65ef7qi9inqqa5911f7', // App Client ID
            Username: username,
            Password: password,
            UserAttributes: [
                {
                    Name: 'email',
                    Value: email,
                },
                {
                    Name: 'nickname', // atributo nickname
                    Value: username,
                }
            ]
        };

        // Registrar el usuario en el User Pool
        const result = await cognito.signUp(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Usuario registrado con éxito. Se ha enviado un correo de verificación.', result }),
        };
    } catch (error) {
        return {
            statusCode: 400,
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
            ClientId: '3vtti4k65ef7qi9inqqa5911f7', // Reemplaza con tu App Client ID
            Username: username,
            ConfirmationCode: confirmationCode,
        };

        // Confirmar el registro del usuario en el User Pool
        await cognito.confirmSignUp(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Correo verificado con éxito.' }),
        };
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Error al verificar el correo', error: error.message }),
        };
    }
}

async function login(event) {
    // logica de inicio de sesión
    try {
        const { username, password } = JSON.parse(event.body);

        const params = {
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: '3vtti4k65ef7qi9inqqa5911f7', // App Client ID
            AuthParameters: {
                USERNAME: username,
                PASSWORD: password,
            },
        };

        const result = await cognito.initiateAuth(params).promise();

        return {
            statusCode: 200,
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
            body: JSON.stringify({ message: 'Error al iniciar sesión', error: error.message }),
        };
    }
}
