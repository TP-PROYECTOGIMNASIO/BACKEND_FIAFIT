import pg from 'pg';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

export const handler = async (event) => {
    // Configuración de conexión a la base de datos PostgreSQL
    const client = new Client({
        host: 'rd-fiafit.cpokqowou7pv.us-east-2.rds.amazonaws.com',
        port: 5432,
        user: 'postgres',
        password: 'JYAnicito23$',
        database: 'postgres',
        ssl: {
            rejectUnauthorized: false
        }
    });

    // Conectar a la base de datos
    await client.connect();

    let requestBody;
    if (event.body) {
        try {
            if (typeof event.body === 'string') {
                requestBody = JSON.parse(event.body);
            } else {
                requestBody = event.body;
            }

            if (typeof requestBody !== 'object') {
                throw new Error('El cuerpo de la solicitud debe ser un objeto JSON.');
            }
        } catch (error) {
            console.error('Error al parsear el cuerpo de la solicitud:', error);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Error al parsear el cuerpo de la solicitud' }),
            };
        }
    } else {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'El cuerpo de la solicitud es obligatorio' }),
        };
    }

    const { action, reportId, sortBy, sortOrder, downloadFormat } = requestBody;

    if (!action) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'La acción es obligatoria' }),
        };
    }

    try {
        switch (action) {
            case 'showSalesReports':
                const reportsRes = await client.query('SELECT report_id, created_at, is_finalized, importe_total FROM t_sales_reports');
                const reports = reportsRes.rows;
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: 'Informes de Ventas', reports }),
                };

            case 'showProductsInReport':
                if (!reportId) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'El ID del informe es obligatorio para mostrar productos' }),
                    };
                }

                const productsRes = await client.query(
                    'SELECT * FROM t_sales_report_products WHERE report_id = $1',
                    [reportId]
                );
                const products = productsRes.rows;
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: 'Productos en el Informe', products }),
                };

            case 'filterReports':
                let query = 'SELECT * FROM t_sales_reports';
                const params = [];

                if (sortBy === 'date') {
                    query += ' ORDER BY created_at';
                    if (sortOrder === 'desc') {
                        query += ' DESC';
                    }
                } else if (sortBy === 'totalPrice') {
                    query += ' ORDER BY importe_total';
                    if (sortOrder === 'desc') {
                        query += ' DESC';
                    }
                }

                const filteredReportsRes = await client.query(query, params);
                const filteredReports = filteredReportsRes.rows;

                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: 'Informes filtrados', reports: filteredReports }),
                };

            case 'downloadReport':
    if (!reportId || !downloadFormat) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'El ID del informe y el formato de descarga son obligatorios' }),
        };
    }

    // Consulta para obtener los datos del informe desde t_sales_report_products
    const reportDataRes = await client.query(
        'SELECT * FROM t_sales_report_products WHERE report_id = $1',
        [reportId]
    );
    const reportData = reportDataRes.rows;

    if (reportData.length === 0) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Informe no encontrado' }),
        };
    }

    // Crear el documento PDF
    const doc = new PDFDocument();
    const filePath = path.resolve(`/tmp/Informe_${reportId}.pdf`); // Almacena en /tmp para Lambda
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Añadir datos generales del informe
    doc.fontSize(20).text('Informe de Ventas', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`ID del Informe: ${reportId}`);
    doc.moveDown();

    // Añadir datos de productos
    reportData.forEach(product => {
        doc.fontSize(12).text(`Producto ID: ${product.report_product_id}`);
        doc.text(`Nombre: ${product.name}`);
        doc.text(`Fecha de Compra: ${product.purchase_date}`);
        doc.text(`Precio Total: ${product.total_price}`);
        doc.text(`Descripción: ${product.description}`);
        doc.text(`Cantidad: ${product.quantity}`);
        doc.text(`Recibo de Compra: ${product.purchase_receipt}`);
        doc.moveDown();
    });

    doc.end();

    await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });

    // Leer el archivo PDF generado
    const pdfBuffer = fs.readFileSync(filePath);

    // Devolver el archivo como un archivo binario
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=Informe_${reportId}.pdf`,
        },
        body: pdfBuffer.toString('base64'),
        isBase64Encoded: true,
    };

        }
    } catch (err) {
        console.error('Error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error interno del servidor' }),
        };
    } finally {
        await client.end();
    }
};
