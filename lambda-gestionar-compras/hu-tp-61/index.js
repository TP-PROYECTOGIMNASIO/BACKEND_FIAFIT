import pkg from 'pg';
const { Client } = pkg;

export const handler = async (event) => {
    // Verificar el método HTTP
    const method = event.httpMethod;
    let requestBody;

    if (method === 'POST') {
        // Verificar si el cuerpo de la solicitud está vacío
        if (!event.body) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
                },
                body: JSON.stringify({ message: 'El cuerpo de la solicitud no puede estar vacío' }),
            };
        }

        // Parsear el cuerpo de la solicitud si está en formato JSON
        if (typeof event.body === 'string') {
            requestBody = JSON.parse(event.body);
        } else {
            requestBody = event.body;
        }
    } else if (method === 'GET') {
        // Si es un GET, no se espera un cuerpo en la solicitud
        requestBody = event.queryStringParameters || {};
    } else {
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

    // Configuración de conexión a la base de datos PostgreSQL
    const client = new Client({
        host: 'rd-fiafit.cpokqowou7pv.us-east-2.rds.amazonaws.com',
        port: 5432,
        user: 'postgres',
        password: 'JYAnicito23$',
        database: 'postgres',
        ssl: {
            rejectUnauthorized: false,
        },
    });

    // Conectar a la base de datos
    await client.connect();

    // Extraer las variables relevantes del cuerpo de la solicitud
    const { action, reportId, image, name, purchaseDate, totalPrice, product_type_id, description, quantity, purchaseReceipt, report_product_id } = requestBody;

    try {
        switch (action) {
            case 'createSalesReport':
                // Crear un nuevo informe de ventas (inicialmente no finalizado)
                const result = await client.query(
                    'INSERT INTO t_sales_reports (manager_id, is_finalized) VALUES ($1, $2) RETURNING report_id',
                    [3, false]  // El ID del manager está codificado, en un escenario real debería ser dinámico
                );
                const newReportId = result.rows[0].report_id;
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: 'Informe de Ventas creado', reportId: newReportId }),
                };

            case 'addProductToReport':
    // Verificar si faltan campos esenciales
    if (!image || !name || !purchaseDate || !totalPrice || !product_type_id || !description || !quantity || !purchaseReceipt) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Todos los campos son obligatorios' }),
        };
    }
    
    // Obtener el report_id de un informe no finalizado
    const activeReportResult = await client.query(
        'SELECT report_id FROM t_sales_reports WHERE is_finalized = false ORDER BY report_id DESC LIMIT 1'
    );

    if (activeReportResult.rows.length === 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'No hay un informe activo. Por favor, crea un nuevo informe de ventas.' }),
        };
    }

    const reportId = activeReportResult.rows[0].report_id;

    // Añadir el producto al informe de ventas activo
    const productResult = await client.query(
        `INSERT INTO t_sales_report_products 
        (report_id, image, name, purchase_date, total_price, product_type_id, description, quantity, purchase_receipt) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING report_product_id`,
        [reportId, image, name, purchaseDate, totalPrice, product_type_id, description, quantity, purchaseReceipt]
    );

    const newReportProductId = productResult.rows[0].report_product_id;

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Producto añadido al informe', report_product_id: newReportProductId }),
    };


            case 'updateProductInReport':
                // Actualizar un producto en el informe de ventas usando report_product_id
                if (!report_product_id || !image || !name || !purchaseDate || !totalPrice || !product_type_id || !description || !quantity || !purchaseReceipt) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'Todos los campos son obligatorios' }),
                    };
                }

                await client.query(
                    `UPDATE t_sales_report_products
                    SET image = $1, name = $2, purchase_date = $3, total_price = $4, product_type_id = $5, description = $6, quantity = $7, purchase_receipt = $8
                    WHERE report_product_id = $9`,
                    [image, name, purchaseDate, totalPrice, product_type_id, description, quantity, purchaseReceipt, report_product_id]
                );

                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: 'Producto actualizado en el informe' }),
                };

            case 'deleteProductFromReport':
                // Eliminar un producto del informe de ventas usando report_product_id
                if (!report_product_id) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'El ID del producto es obligatorio para eliminarlo' }),
                    };
                }

                await client.query(
                    'DELETE FROM t_sales_report_products WHERE report_product_id = $1',
                    [report_product_id]
                );

                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: 'Producto eliminado del informe' }),
                };

            case 'finalizeReport':
                // Marcar un informe de ventas como finalizado
                if (!reportId) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'El ID del informe es obligatorio para finalizarlo' }),
                    };
                }

                await client.query('UPDATE t_sales_reports SET is_finalized = $1 WHERE report_id = $2', [true, reportId]);

                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: 'Informe finalizado exitosamente' }),
                };

            case 'showAllProducts':
                // Mostrar todos los productos asociados a un report_id específico
                if (!reportId) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'El ID del informe es obligatorio para mostrar productos' }),
                    };
                }

                const productsRes = await client.query(
                    'SELECT report_product_id, report_id, purchase_date, product_type_id, name, quantity, total_price FROM t_sales_report_products WHERE report_id = $1',
                    [reportId]
                );
                const products = productsRes.rows.map(product => ({
                    report_product_id: product.report_product_id,
                    report_id: product.report_id,
                    purchase_date: product.purchase_date,
                    product_type_id: product.product_type_id,
                    name: product.name,
                    quantity: product.quantity,
                    total_price: product.total_price
                }));

                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: 'Productos en el Informe', products }),
                };

            default:
                // Caso por defecto si la acción no es reconocida
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Acción no reconocida' }),
                };
        }
    } catch (err) {
        // Manejo de errores en la operación de base de datos
        console.error('Error en la operación de base de datos:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error en la operación de base de datos' }),
        };
    } finally {
        // Cerrar la conexión a la base de datos
        await client.end();
    }
};
