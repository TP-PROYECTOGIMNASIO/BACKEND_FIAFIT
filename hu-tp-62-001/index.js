import pg from 'pg';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

export const handler = async (event) => {
    const client = new Client({
        host: 'dpg-crq80452ng1s73e3ueu0-a.oregon-postgres.render.com',
        port: 5432,
        user: 'fia_fit_user',
        password: 'VKEqqYetj5RXA1Eit0zizGWvoMfw4Opq',
        database: 'fia_fit_db',
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    let requestBody;

    try {
        requestBody = event.body ? JSON.parse(event.body) : {};
    } catch (error) {
        return response(400, 'El cuerpo de la solicitud es inválido');
    }

    const { action, nombre, reporteId, ordenarPor, orden, formatoDescarga, unidadTemporal } = requestBody;

    if (!action) {
        return response(400, 'La acción es obligatoria');
    }

    try {
        switch (action) {
            case 'mostrarInformeYProductos':
                return await listarInformeYProductos(client, reporteId);

            case 'filtrarReportesPorNombre':
                return await filtrarReportesPorNombre(client, nombre);

            case 'filtrarInformes':
                return await filtrarInformes(client, ordenarPor, orden, unidadTemporal);

            case 'descargarInforme':
                return await descargarInforme(client, reporteId, formatoDescarga);

            default:
                return response(400, 'Acción inválida');
        }
    } catch (error) {
        return response(500, 'Error interno del servidor: ' + error.message);
    } finally {
        await client.end();
    }
};

const listarInformeYProductos = async (client) => {
    // Obtener todos los informes
    const informesQuery = 'SELECT report_id, name, assignment_date, expense_incurred FROM t_reports';
    const informesResult = await client.query(informesQuery);
    const informes = informesResult.rows;

    if (informes.length === 0) {
        return response(404, 'No se encontraron informes');
    }

    // Obtener todos los productos relacionados a cada informe
    const productosQuery = `
        SELECT rp.*, p.product_name, rp.report_id
        FROM t_report_purchases rp
        INNER JOIN t_products p ON rp.product_id = p.product_id;
    `;
    const productosResult = await client.query(productosQuery);
    const productos = productosResult.rows;

    // Combinar los informes y sus productos
    const data = informes.map(informe => {
        return {
            ...informe,
            productos: productos.filter(producto => producto.report_id === informe.report_id)
        };
    });

    return response(200, 'Informes y productos obtenidos', data);
};

const filtrarReportesPorNombre = async (client, nombre) => {
    if (!nombre) return response(400, 'El nombre es obligatorio para el filtrado');

    const query = `SELECT report_id, name, assignment_date, expense_incurred FROM t_reports WHERE name ILIKE $1`;
    const result = await client.query(query, [`%${nombre}%`]);

    return response(200, 'Reportes filtrados por nombre', result.rows);
};

const filtrarInformes = async (client, ordenarPor, orden, unidadTemporal) => {
    let query = 'SELECT * FROM t_reports WHERE 1=1';
    const params = [];

    // Filtro por unidad temporal
    if (unidadTemporal) {
        switch (unidadTemporal) {
            case 'dia':
                query += " AND DATE_TRUNC('day', assignment_date) = DATE_TRUNC('day', CURRENT_DATE)";
                break;
            case 'mes':
                query += " AND EXTRACT(MONTH FROM assignment_date) = EXTRACT(MONTH FROM CURRENT_DATE)";
                break;
            case 'ano':
                query += " AND EXTRACT(YEAR FROM assignment_date) = EXTRACT(YEAR FROM CURRENT_DATE)";
                break;
            default:
                return response(400, 'Unidad temporal inválida');
        }
    }

    // Filtro por campo de ordenación
    if (ordenarPor) {
        if (ordenarPor === 'gastoTotal') {
            query += ' ORDER BY expense_incurred';
        } else if (ordenarPor === 'fecha') {
            query += ' ORDER BY assignment_date';
        } else {
            return response(400, 'Campo de ordenación inválido');
        }

        // Orden ascendente o descendente
        query += (orden === 'desc' ? ' DESC' : ' ASC');
    }

    try {
        const result = await client.query(query, params);
        return response(200, 'Informes filtrados', result.rows);
    } catch (error) {
        return response(500, 'Error al ejecutar la consulta de informes filtrados: ' + error.message);
    }
};

// Función para descargar el informe en formato PDF
const descargarInforme = async (client, reporteId, formatoDescarga) => {
    if (!reporteId || !formatoDescarga) return response(400, 'El ID del informe y el formato de descarga son obligatorios');

    // Obtener los datos del informe
    const query = `
        SELECT p.product_name, rp.purchase_quantity, rp.total_price
        FROM t_report_purchases rp
        INNER JOIN t_products p ON rp.product_id = p.product_id
        WHERE rp.report_id = $1
    `;
    const result = await client.query(query, [reporteId]);
    const datosInforme = result.rows;

    if (datosInforme.length === 0) return response(404, 'Informe no encontrado');

    // Crear el documento PDF
    const doc = new PDFDocument();
    const rutaArchivo = path.resolve(`/tmp/Informe_${reporteId}.pdf`);
    const stream = fs.createWriteStream(rutaArchivo);
    doc.pipe(stream);

    // Añadir el contenido al PDF
    doc.fontSize(20).text('Informe de Compras', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`ID del Informe: ${reporteId}`);
    doc.moveDown();
    doc.text(`Este es un informe generado automáticamente.`);

    datosInforme.forEach(producto => {
        doc.fontSize(12).text(`Nombre del Producto: ${producto.product_name}`);
        doc.text(`Cantidad: ${producto.purchase_quantity}`);
        doc.text(`Precio Total: S/. ${producto.total_price}`);
        doc.moveDown();
    });

    doc.fontSize(12).text('Fin del Informe');
    doc.end();

    // Esperar a que el archivo se termine de generar
    await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', (error) => {
            console.error('Error al generar el PDF:', error);
            reject(error);
        });
    });

    // Leer el PDF generado
    const bufferPDF = await fs.promises.readFile(rutaArchivo);

    // Confirmar que el archivo no está vacío
    if (!bufferPDF || bufferPDF.length === 0) {
        console.error('El archivo PDF está vacío o no fue generado correctamente.');
        return response(500, 'El archivo PDF está vacío o no fue generado correctamente.');
    }

    // Eliminar el archivo después de leerlo
    try {
        fs.unlinkSync(rutaArchivo);
        console.log('Archivo PDF eliminado correctamente después de la descarga');
    } catch (err) {
        console.error('Error al eliminar el archivo PDF:', err);
    }

    // Enviar la respuesta con el archivo PDF en base64
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=Informe_${reporteId}.pdf`,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
        },
        body: bufferPDF.toString('base64'),
        isBase64Encoded: true
    };
};

// Función para formatear la respuesta de la Lambda
const response = (statusCode, mensaje, data = null) => {
    return {
        statusCode: statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
        },
        body: JSON.stringify({ mensaje, data }),
    };
};
