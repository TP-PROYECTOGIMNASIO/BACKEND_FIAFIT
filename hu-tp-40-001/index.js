import pkg from 'pg';

// RESPONSABLE: STEPHEN PIERRE
// HISTORIA DE USUARIO: 40 - MANTENER PLAN DE TRATAMIENTO
// DESCRIPCION: Guarda registros de ejercicios de tratamiento
// PATH: https://3zn8rhvzul.execute-api.us-east-2.amazonaws.com/api/empleados/HU-TP-40
// METHODS: GET, POST, UPDATE

const client = new pkg.Pool({
  user: 'fia_fit_user',
  host: 'dpg-crq80452ng1s73e3ueu0-a.oregon-postgres.render.com',
  database: 'fia_fit_db',
  password: 'VKEqqYetj5RXA1Eit0zizGWvoMfw4Opq',
  port: 5432,
  ssl: {
    rejectUnauthorized: false // Solo en desarrollo. En producción, configura esto correctamente.
  }
});

export const handler = async (event) => {
    try {
        // Conecta con la base de datos si no está conectado
      //   if (!client._connected) {
      //       await client.connect();
      //   }
        console.log(event);
        // Datos recibidos del evento (por ejemplo, un JSON)
      //   const { method, id, treatment_exercise_type_id, name, description, active } = JSON.parse(event.body);
      const { method } = JSON.parse(event.body);
        // Obtener todos los ejercicios de tratamiento
        if (method === 'read') {
          const { id } = JSON.parse(event.body);
            const query = `SELECT * FROM public.t_treatment_exercises
                ORDER BY created_at ASC LIMIT 10`; 
            const values = id ? [id] : [];
            const res = await client.query(query, values);
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({
                    message: id ? 'Ejercicios obtenidos con éxito' : 'Productos obtenidos con éxito',
                    exercises: res.rows
                }),
            };
  
        // Inserta un nuevo ejercicio en la tabla t_treatment_exercises
        } else if (method === 'create') {
  
              const { method, treatment_exercise_type_id, name, description, active } = JSON.parse(event.body);
  
            const query = `
                INSERT INTO t_treatment_exercises (treatment_exercise_type_id, name, description, active, created_at, updated_at)
                VALUES ($1, $2, $3, $4, now(), now())
                RETURNING *;
            `;
            const values = [treatment_exercise_type_id, name, description, active];
            const res = await client.query(query, values);
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({
                    message: 'Ejercicio de Tratamiento registrado con éxito',
                    exercise: res.rows[0]
                }),
            };
  
        // Obtener todos los ejercicios activos
        } else if (method === 'readactive') {
            const query = `SELECT * FROM public.t_treatment_exercises
                WHERE active = TRUE
                ORDER BY created_at ASC
                LIMIT 10;`; 
            const res = await client.query(query);
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({
                    message: 'Ejercicios activos obtenidos con éxito',
                    exercises: res.rows
                }),
            };
  
        // Obtener todos los ejercicios inactivos
        } else if (method === 'readinactive') {
            const query = `SELECT * FROM public.t_treatment_exercises
                WHERE active = FALSE
                ORDER BY created_at ASC
                LIMIT 10;`; 
            const res = await client.query(query);
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({
                    message: 'Ejercicios inactivos obtenidos con éxito',
                    exercises: res.rows
                }),
            };
        // Obtener todos los ejercicios activos
        } else if (method === 'readtype') {
            const query = `SELECT * FROM public.t_treatment_exercise_types`; 
            const res = await client.query(query);
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({
                    message: 'Ejercicios activos obtenidos con éxito',
                    typeexercises: res.rows
                }),
            };
  
        // Actualizar el estado "active" de un ejercicio
        } else if (method === 'update') {
  
          const { id, active } = JSON.parse(event.body);
            const query = `
                UPDATE t_treatment_exercises 
                SET active = $1, updated_at = now()
                WHERE treatment_exercise_id = $2
                RETURNING *;
            `;
            const values = [active, id];
            const res = await client.query(query, values);
  
            if (res.rowCount === 0) {
                return {
                    statusCode: 404,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                    },
                    body: JSON.stringify({
                        message: 'No se encontró el ejercicio de tratamiento con el ID proporcionado'
                    }),
                };
            }
  
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({
                    message: 'Estado del ejercicio actualizado con éxito',
                    updatedexercise: res.rows[0]
                }),
            };
  
        } else {
            // Si se envía un método no soportado
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
                },
                body: JSON.stringify({
                    message: 'Método no soportado'
                }),
            };
        }
  
    } catch (err) {
        // Manejo de errores
        console.error('Error al procesar la solicitud:', err.stack);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT'
            },
            body: JSON.stringify({
                message: 'Error al procesar la solicitud',
                error: err.message
            }),
        };
    }
  };