import { handler } from './index.js';
import pkg from 'pg';
const { Client } = pkg;

jest.mock('pg', () => {
    const mClient = {
        connect: jest.fn(),
        query: jest.fn(),
        end: jest.fn(),
    };
    return { Client: jest.fn(() => mClient) };
});

describe('Lambda test', () => {
    let clientMock;

    beforeEach(() => {
        clientMock = new Client();
        clientMock.connect.mockResolvedValue();
        clientMock.end.mockResolvedValue();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should return memberships list on GET request without id', async () => {
        const event = {
            httpMethod: 'GET',
            queryStringParameters: null,
        };

        clientMock.query.mockResolvedValue({
            rows: [
                { membership_id: 1, description: 'Gym Basic', price: 100 },
                { membership_id: 2, description: 'Gym Pro', price: 200 },
            ],
        });

        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({
            memberships: [
                { membership_id: 1, description: 'Gym Basic', price: 100 },
                { membership_id: 2, description: 'Gym Pro', price: 200 },
            ],
        });
        expect(clientMock.query).toHaveBeenCalledWith('SELECT * FROM t_memberships');
    });

    test('should update membership on PUT request with valid id', async () => {
        const event = {
            httpMethod: 'PUT',
            body: JSON.stringify({
                id: 1,
                description: 'New Description',
                price: 150,
            }),
        };

        clientMock.query.mockResolvedValue({
            rows: [
                { membership_id: 1, description: 'New Description', price: 150 },
            ],
        });

        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({
            message: 'Membresía actualizada exitosamente',
            membership: { membership_id: 1, description: 'New Description', price: 150 },
        });
        expect(clientMock.query).toHaveBeenCalledWith(
            'UPDATE t_memberships SET description = $1, price = $2 WHERE membership_id = $3 RETURNING *;',
            ['New Description', 150, 1]
        );
    });

    test('should activate membership on PUT request with action', async () => {
        const event = {
            httpMethod: 'PUT',
            body: JSON.stringify({
                id: 1,
                action: false, // Activar membresía
            }),
        };

        clientMock.query.mockResolvedValue({
            rows: [
                { membership_id: 1, active: true },
            ],
        });

        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({
            message: 'Membresía activada exitosamente',
            membership: { membership_id: 1, active: true },
        });
        expect(clientMock.query).toHaveBeenCalledWith(
            'UPDATE t_memberships SET active = $1 WHERE membership_id = $2 RETURNING *;',
            [true, 1]
        );
    });

    test('should return 400 if PUT request without id', async () => {
        const event = {
            httpMethod: 'PUT',
            body: JSON.stringify({
                description: 'No ID',
            }),
        };

        const response = await handler(event);

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body)).toEqual({
            message: 'ID es requerido',
        });
    });

    test('should handle OPTIONS request for CORS', async () => {
        const event = {
            httpMethod: 'OPTIONS',
        };

        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
        expect(response.headers['Access-Control-Allow-Methods']).toBe('OPTIONS,POST,GET,PUT');
    });

    test('should return 405 for unsupported methods', async () => {
        const event = {
            httpMethod: 'DELETE',
        };

        const response = await handler(event);

        expect(response.statusCode).toBe(405);
        expect(JSON.parse(response.body)).toEqual({
            message: 'Método no permitido',
        });
    });

    test('should handle internal server error', async () => {
        const event = {
            httpMethod: 'GET',
            queryStringParameters: null,
        };

        clientMock.query.mockRejectedValue(new Error('DB Error'));

        const response = await handler(event);

        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.body)).toEqual({
            message: 'Error interno del servidor',
            error: 'DB Error',
        });
    });
});
