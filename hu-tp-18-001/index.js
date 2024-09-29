import https from 'https';
import axios from 'axios';
import pkg from 'pg';
import sgMail from '@sendgrid/mail';

const { Pool } = pkg;

const sendGridApiKey = process.env.SENDGRID_API_KEY;
sgMail.setApiKey(API_KEY);

// Configura la conexión con PostgreSQL
const pool = new Pool({
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
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'OPTIONS,POST',
        'Access-Control-Allow-Credentials': true
    };
    if (event.httpMethod === 'OPTIONS') {
        // Respuesta para solicitudes preflight de CORS
        return {
            statusCode: 204,
            headers: headers,
            body: null
        };
    }
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: headers,
            body: JSON.stringify({ success: false, message: 'Método no permitido' }),
        };
    }
    
    
    try {
        const { token, email, items } = JSON.parse(event.body);
        
        const result = await pool.query('SELECT number_purchase FROM t_report_purchases ORDER BY report_purchase_id DESC LIMIT 1');
        
        // Obtener el último número de boleta
        const lastBoletaNumber = result.rows.length > 0 ? parseInt(result.rows[0].number_purchase) : 143;

        // Generar el siguiente número de boleta
        const newBoletaNumber = lastBoletaNumber + 1;
        const newFileName = `10730125173-03-B001-${newBoletaNumber.toString().padStart(8, '0')}`;
        const newCbcID = `B001-${newBoletaNumber.toString().padStart(8, '0')}`;

        // Obtener información de los productos
        const productIds = items.map(item => item.product_id);
        const productResults = await pool.query('SELECT product_id, price, product_name FROM t_products WHERE product_id = ANY($1)', [productIds]);
        
        // Crear un objeto para almacenar los productos
        const products = productResults.rows.reduce((acc, product) => {
        acc[product.product_id] = {
            price: product.price,
            name: product.product_name
            };
            return acc;
        }, {});
        
        let totalAmount = 0;
        
    let invoiceLines = items.map((item, index) => {
        const product = products[item.product_id] || { price: 0, name: `Producto ${item.product_id}` };
        const priceInSoles = product.price;
        
        totalAmount += priceInSoles * item.quantity;
        
        
        
        return {
            "cbc:ID": { "_text": index + 1 },
            "cbc:InvoicedQuantity": {
                "_attributes": { "unitCode": "NIU" },
                "_text": item.quantity
            },
            "cbc:LineExtensionAmount": {
                "_attributes": { "currencyID": "PEN" },
                "_text": (priceInSoles * item.quantity).toFixed(2)
            },
            "cac:PricingReference": {
                "cac:AlternativeConditionPrice": {
                    "cbc:PriceAmount": {
                        "_attributes": { "currencyID": "PEN" },
                        "_text": (priceInSoles * 1.18).toFixed(2)
                    },
                    "cbc:PriceTypeCode": { "_text": "01" }
                }
            },
            "cac:TaxTotal": {
                "cbc:TaxAmount": {
                    "_attributes": { "currencyID": "PEN" },
                    "_text": (priceInSoles * 0.18 * item.quantity).toFixed(2)
                },
                "cac:TaxSubtotal": [
                    {
                        "cbc:TaxableAmount": {
                            "_attributes": { "currencyID": "PEN" },
                            "_text": (priceInSoles * item.quantity).toFixed(2)
                        },
                        "cbc:TaxAmount": {
                            "_attributes": { "currencyID": "PEN" },
                            "_text": (priceInSoles * 0.18 * item.quantity).toFixed(2)
                        },
                        "cac:TaxCategory": {
                            "cbc:Percent": { "_text": 18 },
                            "cbc:TaxExemptionReasonCode": { "_text": "10" },
                            "cac:TaxScheme": {
                                "cbc:ID": { "_text": "1000" },
                                "cbc:Name": { "_text": "IGV" },
                                "cbc:TaxTypeCode": { "_text": "VAT" }
                            }
                        }
                    }
                ]
            },
            "cac:Item": {
                "cbc:Description": { "_text": products[item.product_id].name || `Producto ${item.product_id}` }
            },
            "cac:Price": {
                "cbc:PriceAmount": {
                    "_attributes": { "currencyID": "PEN" },
                    "_text": priceInSoles.toFixed(2)
                }
            }
        };
    });
    
    const amountInCents = Math.round(totalAmount * 100);
    const postData = JSON.stringify({
            amount: amountInCents, // Monto en centavos (ej. 1000 = 10.00 PEN)
            currency_code: 'PEN',
            email: email,
            source_id: token
        });
    const options = {
        hostname: 'api.culqi.com',
        path: '/v2/charges',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer sk_test_0df6274e07cec4fb', // Reemplaza con tu llave privada
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    // Enviar solicitud a Culqi
    const paymentResponse = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    data: data
                });
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(postData);
        req.end();
    });

    const parsedPaymentResponse = JSON.parse(paymentResponse.data);

    // Verifica si el pago fue exitoso
    if (paymentResponse.statusCode !== 201) {
        return {
            statusCode: paymentResponse.statusCode,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            body: JSON.stringify({ success: false, message: parsedPaymentResponse.user_message || 'Error en la solicitud de pago' }),
        };
    }
    
    const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Obtener la fecha actual
const currentDate = new Date();
const formattedDate = formatDate(currentDate);
    
    const totalAmountWithIGV = totalAmount * 1.18; // Aplicando IGV del 18%
    const totalAmountDecimalPart = Math.round((totalAmountWithIGV % 1) * 100); // Extrayendo los decimales
        const sunatData = {
            personaId: "66d7b0d31dda220015a8476d",
            personaToken: "DEV_UuxCz6pHIZJc7C9ar9FqcRzXstvb0FkMpHuVpJ5j2hSSaeEWgTcdKKJ5rHFaJOMe",
            fileName: newFileName,
            documentBody: {
                "cbc:UBLVersionID": { "_text": "2.1" },
                "cbc:CustomizationID": { "_text": "2.0" },
                "cbc:ID": { "_text": newCbcID },
                "cbc:IssueDate": { "_text": formattedDate },
                "cbc:InvoiceTypeCode": {
                    "_attributes": { "listID": "0101" },
                    "_text": "03"
                },
                "cbc:Note": [{
                    "_text": `${Math.floor(totalAmountWithIGV)} CON ${totalAmountDecimalPart}/100 SOLES`,
                    "_attributes": { "languageLocaleID": "1000" }
                }],
                "cbc:DocumentCurrencyCode": { "_text": "PEN" },
                "cac:AccountingSupplierParty": {
        "cac:Party": {
            "cac:PartyIdentification": {
                "cbc:ID": {
                    "_attributes": {
                        "schemeID": "6"
                    },
                    "_text": "10730125173"
                }
            },
            "cac:PartyLegalEntity": {
                "cbc:RegistrationName": {
                    "_text": "FIA FIT"
                },
                "cac:RegistrationAddress": {
                    "cbc:AddressTypeCode": {
                        "_text": "0000"
                    },
                    "cac:AddressLine": {
                        "cbc:Line": {
                            "_text": "JR. LOS COCOS MZA. H LOTE. 07 URB. PORTADA DE CERES SANTA ANITA LIMA LIMA"
                        }
                    }
                }
            }
        }
    },
    "cac:AccountingCustomerParty": {
        "cac:Party": {
            "cac:PartyIdentification": {
                "cbc:ID": {
                    "_attributes": {
                        "schemeID": "1"
                    },
                    "_text": "00000000"
                }
            },
            "cac:PartyLegalEntity": {
                "cbc:RegistrationName": {
                    "_text": "---"
                }
            }
        }
    },
    "cac:TaxTotal": {
        "cbc:TaxAmount": {
            "_attributes": {
                "currencyID": "PEN"
            },
            "_text": (totalAmount * 0.18).toFixed(2)
        },
        "cac:TaxSubtotal": [
            {
                "cbc:TaxableAmount": {
                    "_attributes": {
                        "currencyID": "PEN"
                    },
                    "_text": totalAmount.toFixed(2)
                },
                "cbc:TaxAmount": {
                    "_attributes": {
                        "currencyID": "PEN"
                    },
                    "_text": (totalAmount * 0.18).toFixed(2)
                },
                "cac:TaxCategory": {
                    "cac:TaxScheme": {
                        "cbc:ID": {
                            "_text": "1000"
                        },
                        "cbc:Name": {
                            "_text": "IGV"
                        },
                        "cbc:TaxTypeCode": {
                            "_text": "VAT"
                        }
                    }
                }
            }
        ]
    },
    "cac:LegalMonetaryTotal": {
        "cbc:LineExtensionAmount": {
            "_attributes": {
                "currencyID": "PEN"
            },
            "_text": totalAmount.toFixed(2)
        },
        "cbc:TaxInclusiveAmount": {
            "_attributes": {
                "currencyID": "PEN"
            },
            "_text": (totalAmount * 1.18).toFixed(2)
        },
        "cbc:PayableAmount": {
            "_attributes": {
                "currencyID": "PEN"
            },
            "_text": (totalAmount * 1.18).toFixed(2)
        }
    },
    "cac:InvoiceLine": invoiceLines
            }
        };

        // Enviar la solicitud POST a la API de SUNAT
        const sunatResponse = await axios.post('https://back.apisunat.com/personas/v1/sendBill', sunatData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const reportResult = await pool.query(
    'INSERT INTO t_reports (name, expense_incurred) VALUES ($1, $2) RETURNING report_id',
    ['Reporte de Compra', totalAmount * 1.18] // Asumiendo un nombre para el reporte y el monto total con IGV
);
const reportId = reportResult.rows[0].report_id;

const documentId = sunatResponse.data.documentId;
const fileName = newFileName + '.pdf'; // Asegúrate de añadir la extensión .pdf al final

    // Construye la URL del PDF
    const pdfUrl = `https://back.apisunat.com/documents/${documentId}/getPDF/A4/${fileName}`; 
// 2. Inserta los registros correspondientes en `report_purchases`
for (const item of items) {
    // Asegúrate de obtener el precio correcto del producto desde tu base de datos
    const productPrice = products[item.product_id] ? products[item.product_id].price : 0;
    
    // Calcular el precio total para la cantidad de productos
    const totalPrice = productPrice * item.quantity;

    // Insertar en la tabla report_purchases incluyendo el total_price
    await pool.query(
        'INSERT INTO t_report_purchases (report_id, number_purchase, product_id, purchase_date, purchase_quantity, total_price, purchase_receipt_url, location_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
            reportId,
            newBoletaNumber, // Número de boleta o compra
            item.product_id, // Producto relacionado
            new Date(), // Fecha de la compra
            item.quantity, // Cantidad comprada
            totalPrice, // Precio total calculado
            pdfUrl, // URL del recibo
            null // Aquí podrías agregar el location_id si aplica
        ]
    );
}
    

    const message = {
        to: email,
        from: 'fiafit853@gmail.com', // Usa tu propio dominio verificado en SendGrid
        subject: 'Confirmación de Pago',
        text: `Gracias por tu compra. Tu número de boleta es ${newBoletaNumber}.`,
        html: `<strong>Gracias por tu compra. Tu número de boleta es ${newBoletaNumber}. Puedes descargar tu documento PDF desde el siguiente enlace: <a href="${pdfUrl}">Descargar PDF</a>.</strong>`,
    };

    try {
        await sgMail.send(message);
        console.log('Correo de confirmación enviado');
    } catch (error) {
        console.error('Error al enviar el correo', error);
    }
    
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Solicitud enviada a SUNAT con éxito',
                    data: sunatResponse.data,
                    boletaNumber: newBoletaNumber
                })
            };
        } catch (error) {
            console.error(error);
    
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: 'Error al procesar la solicitud',
                    error: error.message
                })
            };
        }
    };
