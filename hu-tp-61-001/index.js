import pkg from 'pg';
const { Client } = pkg;

// Variable global para almacenar productos temporalmente
let productosTemporales = [];

export const handler = async (event) => {
    const method = event.httpMethod;
    let requestBody;

    if (method !== 'POST' && method !== 'GET') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
            },
            body: JSON.stringify({ message: 'Método no permitido' }),
        };
    }

    const client = new Client({
        host: 'dpg-crq80452ng1s73e3ueu0-a.oregon-postgres.render.com',
        port: 5432,
        user: 'fia_fit_user',
        password: 'VKEqqYetj5RXA1Eit0zizGWvoMfw4Opq',
        database: 'fia_fit_db',
        ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    try {
        if (method === 'POST') {
            requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

            console.log("Request Body:", requestBody); // Para depurar

            // Acción para obtener los tipos de productos
            if (requestBody.action === 'fetchProductTypes') {
                return await obtenerTiposDeProducto(client);
            }

            // Acción para obtener productos por tipo
            if (requestBody.action === 'fetchProductsByType') {
                const { productTypeId } = requestBody;
                return await obtenerProductosPorTipo(client, productTypeId);
            }

            // Acción para obtener sedes
            if (requestBody.action === 'fetchLocations') {
                return await obtenerSedes(client);
            }

            // Acción para almacenar temporalmente los productos con número de compra
            if (requestBody.action === 'almacenarTemporalmente') {
                let nextPurchaseNumber = productosTemporales.length > 0
                    ? Math.max(...productosTemporales.map(p => p.number_purchase || 0)) 
                    : 0;

                requestBody.products.forEach(product => {
                    nextPurchaseNumber++;
                    product.number_purchase = nextPurchaseNumber; 
                    productosTemporales.push(product); 
                });

                console.log("Productos temporales almacenados:", productosTemporales);

                return {
                    statusCode: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
                    },
                    body: JSON.stringify({
                        message: 'Productos almacenados temporalmente.',
                        productos: productosTemporales
                    }),
                };
            }

            // Acción para listar los productos almacenados temporalmente
            if (requestBody.action === 'fetchProductsByReport') {
                return listarProductosTemporales();
            }

            // Acción para borrar los productos almacenados temporalmente
            if (requestBody.action === 'borrarProductosTemporales') {
                return borrarProductosTemporales();
            }

            // Acción para guardar los productos almacenados temporalmente en la base de datos
            if (requestBody.action === 'guardarInforme') {
                if (productosTemporales.length === 0) {
                    return {
                        statusCode: 400,
                        headers: {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Headers': 'Content-Type',
                            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
                        },
                        body: JSON.stringify({ error: 'No hay productos temporales para guardar.' }),
                    };
                }
                return await guardarInforme(client, true, productosTemporales);
            }

            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
                },
                body: JSON.stringify({ message: 'Acción no especificada o no válida.' }),
            };
        }

        return {
            statusCode: 404,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
            },
            body: JSON.stringify({ message: 'Ruta no encontrada' }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
            },
            body: JSON.stringify({ error: error.message }),
        };
    } finally {
        await client.end();
    }
};

// Función para listar los productos temporales enviados por el front-end
const listarProductosTemporales = () => {
    if (productosTemporales.length === 0) {
        return {
            statusCode: 404,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
            },
            body: JSON.stringify({ message: 'No hay productos temporales para listar.' }),
        };
    }

    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
        },
        body: JSON.stringify(productosTemporales),
    };
};

// Nueva función para borrar los productos temporales
const borrarProductosTemporales = () => {
    productosTemporales = []; // Vaciar el array de productos temporales
    console.log('Productos temporales eliminados');

    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
        },
        body: JSON.stringify({ message: 'Productos temporales borrados.' }),
    };
};

// Función para guardar informe en la base de datos
const guardarInforme = async (client, confirmSave, products) => {
    if (!confirmSave || !Array.isArray(products) || products.length === 0) {
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
            },
            body: JSON.stringify({ error: 'Confirmación de guardado y productos son obligatorios.' }),
        };
    }

    try {
        await client.query('BEGIN'); // Iniciar una transacción

        const resReportId = await client.query(`SELECT COALESCE(MAX(report_id), 0) AS max_report_id FROM t_reports`);
        const newReportId = resReportId.rows[0].max_report_id + 1;

        // Crear el nuevo informe en t_reports
        await client.query(
            `INSERT INTO t_reports (report_id, name, assignment_date, expense_incurred, created_at, updated_at)
             VALUES ($1, $2, NOW(), 0, NOW(), NOW())`,
            [newReportId, `Informe ${newReportId}`]
        );

        let totalAmount = 0;

        // Insertar productos en la tabla t_report_purchases
        for (let product of products) {
            const { product_id, number_purchase, purchase_date, purchase_quantity, total_price, purchase_receipt_url, location_id } = product;

            if (!product_id || !purchase_date || !purchase_quantity || !total_price || !number_purchase) {
                throw new Error('Los campos requeridos del producto son obligatorios, incluido number_purchase.');
            }

            totalAmount += total_price;

            await client.query(
                `INSERT INTO t_report_purchases 
                (report_id, number_purchase, product_id, purchase_date, purchase_quantity, total_price, purchase_receipt_url, location_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [newReportId, number_purchase, product_id, purchase_date, purchase_quantity, total_price, purchase_receipt_url, location_id]
            );
        }

        // Actualizar el monto total del informe en t_reports
        await client.query(
            `UPDATE t_reports SET expense_incurred = $1 WHERE report_id = $2`,
            [totalAmount, newReportId]
        );

        await client.query('COMMIT'); // Finalizar la transacción

        // Limpiar el array de productos temporales después de guardarlos
        productosTemporales = [];

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
            },
            body: JSON.stringify({ message: 'Informe guardado correctamente', reportId: newReportId }),
        };
    } catch (error) {
        await client.query('ROLLBACK');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error al guardar informe: ' + error.message }),
        };
    }
};

// Función para obtener tipos de productos
const obtenerTiposDeProducto = async (client) => {
    try {
        const result = await client.query('SELECT product_type_id,product_type_name FROM t_product_types');
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
            },
            body: JSON.stringify(result.rows),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error al obtener tipos de producto: ' + error.message }),
        };
    }
};

// Función para obtener productos por tipo de producto
const obtenerProductosPorTipo = async (client, productTypeId) => {
    try {
        const result = await client.query(
            'SELECT product_id, product_name FROM t_products WHERE product_type_id = $1',
            [productTypeId]
        );
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
            },
            body: JSON.stringify(result.rows),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error al obtener productos por tipo: ' + error.message }),
        };
    }
};

// Función para obtener sedes
const obtenerSedes = async (client) => {
    try {
        const result = await client.query('SELECT location_id, product_type_names FROM t_locations');
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
            },
            body: JSON.stringify(result.rows),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error al obtener sedes: ' + error.message }),
        };
    }
};
