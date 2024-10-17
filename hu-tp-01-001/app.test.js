import AWS from 'aws-sdk';
import { handler } from './index'; // Importa el handler que estás probando

// Mock de AWS SDK para que no se hagan llamadas reales
jest.mock('aws-sdk', () => {
    const CognitoIdentityServiceProvider = {
        confirmSignUp: jest.fn().mockReturnThis(),
        signUp: jest.fn().mockReturnThis(),
        initiateAuth: jest.fn().mockReturnThis(),
        promise: jest.fn(),
    };
    return {
        CognitoIdentityServiceProvider: jest.fn(() => CognitoIdentityServiceProvider),
        config: {
            update: jest.fn(),
        },
    };
});

// Configurar las variables globales necesarias
const cognito = new AWS.CognitoIdentityServiceProvider();

describe('Lambda handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 405 if method is not allowed', async () => {
        const event = { httpMethod: 'DELETE' }; // Método no permitido
        const result = await handler(event);
        expect(result.statusCode).toBe(405);
        expect(JSON.parse(result.body).message).toBe('Método no permitido');
    });

    it('should confirm email successfully on PUT method', async () => {
        cognito.confirmSignUp.mockReturnValueOnce({
            promise: jest.fn().mockResolvedValue({}),
        });

        const event = {
            httpMethod: 'PUT',
            body: JSON.stringify({ username: 'testuser', confirmationCode: '123456' }),
        };

        const result = await handler(event);
        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body).message).toBe('Correo verificado con éxito.');
    });

    it('should login successfully on POST method', async () => {
        cognito.initiateAuth.mockReturnValueOnce({
            promise: jest.fn().mockResolvedValue({
                AuthenticationResult: {
                    IdToken: 'id_token',
                    AccessToken: 'access_token',
                    RefreshToken: 'refresh_token',
                },
            }),
        });

        const event = {
            httpMethod: 'POST',
            body: JSON.stringify({ username: 'testuser', password: 'password123' }),
        };

        const result = await handler(event);
        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.message).toBe('Login exitoso.');
        expect(body.idToken).toBe('id_token');
        expect(body.accessToken).toBe('access_token');
        expect(body.refreshToken).toBe('refresh_token');
    });

    it('should return an error on login failure', async () => {
        cognito.initiateAuth.mockImplementationOnce(() => {
            throw new Error('Invalid credentials');
        });

        const event = {
            httpMethod: 'POST',
            body: JSON.stringify({ username: 'testuser', password: 'wrongpassword' }),
        };

        const result = await handler(event);
        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).message).toBe('Error al iniciar sesión');
    });
});
