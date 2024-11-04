import { handler } from './index.js'; 

describe('API de Membresías', () => {
  it('mi prueba de función', async () => {
    const event = {
      httpMethod: 'GET',
      queryStringParameters: {},
    };
    
    const response = await handler(event);
    
    expect(response.statusCode).toBe(200);
    
    expect(JSON.parse(response.body)).toEqual(expect.arrayContaining([ /* tu valor esperado aquí */ ]));
  });

});
