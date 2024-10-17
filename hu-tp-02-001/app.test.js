import AWS from 'aws-sdk';
import { handler } from './index'; // Importa el handler que estás probando

// Mock de AWS SDK para que no se hagan llamadas reales
jest.mock('aws-sdk', () => {
    const CognitoIdentityServiceProvider = {
        forgotPassword: jest.fn().mockReturnThis(),
        confirmForgotPassword: jest.fn().mockReturnThis(),
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

describe('Lambda handler - Password Reset', () => {
    beforeEach(() => {
        jest.clearAllMocks(); // Limpiar mocks antes de cada prueba
    });

    // Prueba para método no permitido (405)
    it('should return 405 if method is not allowed', async () => {
        const event = { httpMethod: 'DELETE' }; // Método no permitido
        const result = await handler(event);
        expect(result.statusCode).toBe(405);
        expect(JSON.parse(result.body).message).toBe('Método no permitido');
    });

    // Prueba para iniciar el restablecimiento de contraseña (PATCH)
    it('should initiate password reset on PATCH method', async () => {
        cognito.forgotPassword.mockReturnValueOnce({
            promise: jest.fn().mockResolvedValue({}),
        });

        const event = {
            httpMethod: 'PATCH',
            body: JSON.stringify({ username: 'testuser' }),
        };

        const result = await handler(event);
        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body).message).toBe('Código de verificación enviado para restablecer la contraseña.');
    });

    // Prueba de error al iniciar el restablecimiento de contraseña
    it('should handle error on initiating password reset', async () => {
        cognito.forgotPassword.mockImplementationOnce(() => {
            throw new Error('Error initiating password reset');
        });

        const event = {
            httpMethod: 'PATCH',
            body: JSON.stringify({ username: 'testuser' }),
        };

        const result = await handler(event);
        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).message).toBe('Error al iniciar el proceso de recuperación de contraseña');
    });

    // Prueba para confirmar el restablecimiento de contraseña (PUT)
    it('should confirm password reset on PUT method', async () => {
        cognito.confirmForgotPassword.mockReturnValueOnce({
            promise: jest.fn().mockResolvedValue({}),
        });

        const event = {
            httpMethod: 'PUT',
            body: JSON.stringify({ username: 'testuser', confirmationCode: '123456', newPassword: 'newPassword123' }),
        };

        const result = await handler(event);
        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body).message).toBe('Contraseña restablecida con éxito.');
    });

    // Prueba de error al confirmar el restablecimiento de contraseña
    it('should handle error on confirming password reset', async () => {
        cognito.confirmForgotPassword.mockImplementationOnce(() => {
            throw new Error('Error confirming password reset');
        });

        const event = {
            httpMethod: 'PUT',
            body: JSON.stringify({ username: 'testuser', confirmationCode: '123456', newPassword: 'newPassword123' }),
        };

        const result = await handler(event);
        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).message).toBe('Error al restablecer la contraseña');
    });
});
