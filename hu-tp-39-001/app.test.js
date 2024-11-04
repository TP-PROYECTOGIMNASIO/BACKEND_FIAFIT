import { handler } from './index.js'; // Asegúrate de que el path sea correcto
import { Client } from 'pg';

jest.mock('pg', () => {
  const mClient = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  };
  return { Client: jest.fn(() => mClient) };
});

describe('Lambda VISUALIZAR PLAN DE TRATAMIENTO - HU 30', () => {
  let client;
  
  beforeEach(() => {
    client = new Client();
    client.connect.mockClear();
    client.query.mockClear();
    client.end.mockClear();
  });

  test('Debería devolver una lista de clientes con membresía Black o Premium', async () => {
    client.query.mockResolvedValueOnce({
      rows: [
        { client_id: 1, names: 'John', father_last_name: 'Doe', mother_last_name: 'Smith', membership_name: 'Black', age: 30 }
      ]
    });

    const event = {
      httpMethod: 'GET',
      queryStringParameters: {}
    };

    const response = await handler(event);
    
    expect(response.statusCode).toBe(200);
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("SELECT c.client_id"), []);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Lista de clientes obtenida exitosamente.');
    expect(body.clients).toHaveLength(1);
  });

  test('Debería devolver los detalles del plan de tratamiento de un cliente específico', async () => {
    client.query.mockResolvedValueOnce({
      rows: [
        { treatment_plan_id: 101, diagnosis: 'Lumbalgia', instructions: 'Ejercicios suaves', sessions_number: 5, treatment_exercise_id: 10, session_date: '2023-01-10', session_time: '10:00', gender: 'Masculino', age: 40 }
      ]
    });

    const event = {
      httpMethod: 'GET',
      queryStringParameters: { client_id: '1' }
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("SELECT tp.treatment_plan_id"), ['1']);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Plan de tratamiento, edad y género obtenidos exitosamente.');
    expect(body.treatmentPlan).toHaveLength(1);
  });

  test('Debería devolver el plan de tratamiento más reciente de un cliente', async () => {
    client.query.mockResolvedValueOnce({
      rows: [
        { treatment_plan_id: 202, diagnosis: 'Cervicalgia', instructions: 'Terapia con calor', sessions_number: 3, treatment_exercise_id: 12, session_date: '2023-01-20', session_time: '11:00', gender: 'Femenino', age: 35 }
      ]
    });

    const event = {
      httpMethod: 'GET',
      queryStringParameters: { client_id: '2' }
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("ORDER BY tp.treatment_assignment_date DESC"), ['2']);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Plan de tratamiento más reciente, edad y género obtenidos exitosamente.');
    expect(body.treatmentPlan).toHaveLength(1);
  });

  test('Debería devolver los planes de tratamiento de meses anteriores de un cliente', async () => {
    client.query.mockResolvedValueOnce({
      rows: [
        { treatment_plan_id: 303, diagnosis: 'Tendinitis', instructions: 'Ejercicios de fortalecimiento', sessions_number: 8, treatment_exercise_id: 14, session_date: '2023-02-10', session_time: '09:00', gender: 'Masculino', age: 45 }
      ]
    });

    const event = {
      httpMethod: 'GET',
      queryStringParameters: { client_id: '3', month: '02' }
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("EXTRACT(MONTH FROM tp.treatment_assignment_date)"), ['3', '02']);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Planes de tratamiento anteriores obtenidos exitosamente.');
    expect(body.treatmentPlans).toHaveLength(1);
  });

  test('Debería devolver un mensaje de error si no se proporcionan parámetros correctos', async () => {
    const event = {
      httpMethod: 'POST', // Cambia el método a algo incorrecto
      queryStringParameters: {}
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Solicitud incorrecta. Revisa los parámetros de consulta.');
  });

  test('Debería manejar errores internos del servidor', async () => {
    client.query.mockRejectedValueOnce(new Error('Error en la base de datos'));

    const event = {
      httpMethod: 'GET',
      queryStringParameters: { client_id: '1' }
    };

    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Error interno del servidor: Error en la base de datos');
  });
});
