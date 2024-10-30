import { handler } from './index.js';
import pkg from 'pg';
const { Pool } = pkg;

jest.mock('pg', () => {
    const mClient = {
        query: jest.fn(),
        end: jest.fn(),
    };
    return {
        Pool: jest.fn(() => mClient),
    };
});

describe('Lambda function tests', () => {
    let pool;

    beforeAll(() => {
        pool = new Pool();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('GET - Fetch all records', async () => {
        pool.query.mockResolvedValue({ rows: [{ event_id: 1 }, { event_id: 2 }] });
        const event = { httpMethod: 'GET', queryStringParameters: null };

        const response = await handler(event);

        expect(pool.query).toHaveBeenCalledWith('SELECT * FROM t_events');
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual([{ event_id: 1 }, { event_id: 2 }]);
    });

    it('GET - Fetch detailed fields only', async () => {
        pool.query.mockResolvedValue({ rows: [{ image_url: 'url', name: 'Event' }] });
        const event = { httpMethod: 'GET', queryStringParameters: { detail: 'true' } };

        const response = await handler(event);

        expect(pool.query).toHaveBeenCalledWith(
            'SELECT image_url, name, description, requirements, location_id, capacity, event_date, schedule FROM t_events'
        );
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual([{ image_url: 'url', name: 'Event' }]);
    });

    it('GET - Fetch events by date', async () => {
        const testDate = '2023-01-01';
        pool.query.mockResolvedValue({ rows: [{ event_id: 1 }] });
        const event = { httpMethod: 'GET', queryStringParameters: { date: testDate } };

        const response = await handler(event);

        expect(pool.query).toHaveBeenCalledWith('SELECT * FROM t_events WHERE event_date = $1', [testDate]);
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual([{ event_id: 1 }]);
    });

    it('GET - Fetch events by approval status', async () => {
        pool.query.mockResolvedValue({ rows: [] });
        const event = { httpMethod: 'GET', queryStringParameters: { approved: 'false' } };

        const response = await handler(event);

        expect(pool.query).toHaveBeenCalledWith('SELECT * FROM t_events WHERE approved = $1', [false]);
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ message: 'No hay eventos desaprobados.' });
    });

    it('PUT - Update event approval status', async () => {
        const eventId = 1;
        const approved = true;
        pool.query.mockResolvedValue({ rows: [{ event_id: eventId, approved }] });
        const event = {
            httpMethod: 'PUT',
            body: JSON.stringify({ event_id: eventId, approved }),
        };

        const response = await handler(event);

        expect(pool.query).toHaveBeenCalledWith(
            'UPDATE t_events SET approved = $1 WHERE event_id = $2 RETURNING *',
            [approved, eventId]
        );
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual([{ event_id: eventId, approved }]);
    });

    it('PUT - Invalid PUT request', async () => {
        const event = { httpMethod: 'PUT', body: JSON.stringify({ event_id: null, approved: 'true' }) };

        const response = await handler(event);

        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.body)).toEqual({ error: 'Error interno del servidor' });
    });

    it('Handles unexpected errors', async () => {
        pool.query.mockRejectedValue(new Error('Database error'));
        const event = { httpMethod: 'GET' };

        const response = await handler(event);

        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.body)).toEqual({ error: 'Error interno del servidor' });
    });
});
