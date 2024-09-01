import pkg from 'pg';
const { Client } = pkg;
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const s3 = new AWS.S3();

const BUCKET_NAME = 'hu-tp-76-001';
const DEFAULT_IMAGE_URL = 'https://example.com/default-image.jpg'; // URL de la imagen predeterminada

export async function handler(event) {
    const client = new Client({
        user: 'db_gym_render_user',
        host: 'dpg-cr5568ij1k6c73934m10-a.oregon-postgres.render.com',
        database: 'db_gym_render',
        password: 'LusVdIcmARRFj7nY76BbOj9MzQ2Y33I5',
        port: 5432,
        ssl: {
            rejectUnauthorized: false // Solo en desarrollo. En producción, configura esto correctamente.
        }
    });

    let name, address, imageUrl;

    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
                body: JSON.stringify({ message: 'El cuerpo de la solicitud no puede estar vacío' }),
            };
        }

        const parsedBody = JSON.parse(event.body);
        name = parsedBody.name;
        address = parsedBody.address;
        const base64Image = parsedBody.photo; // Imagen en formato base64

        if (!name || !address) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
                body: JSON.stringify({ message: 'Nombre y dirección son requeridos' }),
            };
        }

        if (base64Image) {
            const fileName = `${uuidv4()}.jpg`;

            const s3Params = {
                Bucket: BUCKET_NAME,
                Key: fileName,
                Body: Buffer.from(base64Image, 'base64'),
                ContentEncoding: 'base64',
                ContentType: 'image/jpeg'
            };

            const s3Response = await s3.upload(s3Params).promise();
            imageUrl = s3Response.Location; // URL de la imagen en S3
        } else {
            imageUrl = DEFAULT_IMAGE_URL; // Usar la URL de imagen predeterminada
        }

        await client.connect();

        const insertQuery = `
            INSERT INTO public.t_locations (c_name, address, image_url, created_at, updated_at, status)
            VALUES ($1, $2, $3, NOW(), NOW(), 'active')
            RETURNING *;
        `;
        const values = [name, address, imageUrl];

        const res = await client.query(insertQuery, values);
        const newLocation = res.rows[0];

        await client.end();

        return {
            statusCode: 201,
            headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
            body: JSON.stringify({
                message: 'Sede registrada exitosamente',
                location: newLocation,
            }),
        };
    } catch (err) {
        await client.end();
        if (err.code === '23505') { // Error de clave duplicada
            return {
                statusCode: 409,
                headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
                body: JSON.stringify({ message: 'Ya existe una sede con el mismo nombre y dirección' }),
            };
        }
        return {
            statusCode: 500,
            headers: {
                    'Access-Control-Allow-Origin': '*',  // Permitir solicitudes desde cualquier origen
                    'Access-Control-Allow-Headers': 'Content-Type',  // Permitir ciertos encabezados
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT' // Permitir ciertos métodos HTTP
                },
            body: JSON.stringify({ message: 'Error interno del servidor', error: err.message }),
        };
    }
}