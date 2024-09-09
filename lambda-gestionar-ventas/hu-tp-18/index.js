import https from 'https';
import axios from 'axios';
import pkg from 'pg';
import sgMail from '@sendgrid/mail';

const { Pool } = pkg;

const API_KEY = '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';

// Configura la conexión con PostgreSQL
const pool = new Pool({
    user: 'db_gym_render_user',
    host: 'dpg-cr5568ij1k6c73934m10-a.oregon-postgres.render.com',
    database: 'db_gym_render',
    password: 'LusVdIcmARRFj7nY76BbOj9MzQ2Y33I5',
    port: 5432,
    ssl: {
        rejectUnauthorized: false // Solo en desarrollo. En producción, configura esto correctamente.
    }
});

sgMail.setApiKey(API_KEY);

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            body: JSON.stringify({ success: false, message: 'Método no permitido' }),
        };
    }
    
    
    try {
        const { token, email, items } = JSON.parse(event.body);
        
        
        // Obtener el último número de boleta
        const result = await pool.query('SELECT numero_boleta FROM boletas ORDER BY id DESC LIMIT 1');
        const lastBoletaNumber = result.rows.length > 0 ? result.rows[0].numero_boleta : 34; // Inicia en 34 si no hay registros

        // Generar el siguiente número de boleta
        const newBoletaNumber = lastBoletaNumber + 1;
        const newFileName = `10730125173-03-B001-${newBoletaNumber.toString().padStart(8, '0')}`;
        const newCbcID = `B001-${newBoletaNumber.toString().padStart(8, '0')}`;

        let totalAmount = 0;
    let invoiceLines = items.map((item, index) => {
        const priceInSoles = item.amount / 100;
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
                "cbc:Description": { "_text": item.description }
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
                "cbc:IssueDate": { "_text": "2024-09-04" },
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
        
        // Insertar la nueva boleta en la base de datos
        await pool.query('INSERT INTO boletas (numero_boleta, filename, cbc_id) VALUES ($1, $2, $3)', 
            [newBoletaNumber, newFileName, newCbcID]);
    
    
        
    const documentId = sunatResponse.data.documentId;
    const fileName = newFileName + '.pdf'; // Asegúrate de añadir la extensión .pdf al final

    // Construye la URL del PDF
    const pdfUrl = `https://back.apisunat.com/documents/${documentId}/getPDF/A4/${fileName}`;    
        

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
