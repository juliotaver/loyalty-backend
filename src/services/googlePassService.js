// backend/src/services/googlePassService.js
import { GoogleAuth } from 'google-auth-library';

export class GooglePassService {
  constructor() {
    this.issuerId = process.env.GOOGLE_ISSUER_ID;
    
    // Corregir el formato de la clave privada
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    this.credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey
    };

    try {
      this.auth = new GoogleAuth({
        credentials: this.credentials,
        scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
      });

      console.log('GooglePassService inicializado con:', {
        issuerId: this.issuerId,
        clientEmail: this.credentials.client_email,
        hasPrivateKey: !!this.credentials.private_key
      });
    } catch (error) {
      console.error('Error inicializando GooglePassService:', error);
      throw error;
    }
  }

  async generatePass(client) {
    try {
      console.log('Generando pase Google para:', client.email);

      const authClient = await this.auth.getClient();
      console.log('Cliente de autenticación creado');

      const loyaltyObject = {
        id: `${this.issuerId}.${client.passSerialNumber}`,
        classId: `${this.issuerId}.loyalty_class`,
        state: 'ACTIVE',
        heroImage: {
          sourceUri: {
            uri: "https://ejemplo.com/logo.png"
          },
          contentDescription: {
            defaultValue: {
              language: "es-ES",
              value: "Logo Leu Beauty"
            }
          }
        },
        textModulesData: [
          {
            header: "Visitas",
            body: `${client.visits} visitas`,
            id: "visits"
          },
          {
            header: "Próxima Recompensa",
            body: this.getNextReward(client.visits),
            id: "reward"
          }
        ],
        linksModuleData: {
          uris: [
            {
              uri: "tel://7773621171",
              description: "Llamar al salón"
            }
          ]
        },
        barcode: {
          type: "QR_CODE",
          value: client.passSerialNumber
        },
        locations: [
          {
            latitude: 18.9261,
            longitude: -99.2333
          }
        ]
      };

      console.log('Objeto de lealtad creado:', loyaltyObject.id);

      const response = await authClient.request({
        url: 'https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject',
        method: 'POST',
        data: loyaltyObject
      });

      console.log('Pase creado exitosamente');

      // Generar URL para guardar en Google Wallet
      const claims = {
        iss: this.credentials.client_email,
        aud: 'google',
        origins: [
          'https://loyalty-frontend-iota.vercel.app',  // Tu dominio de Vercel
          'https://loyalty-backend-production-d6ae.up.railway.app' // Tu dominio de Railway
        ],
        typ: 'savetowallet',
        payload: {
          loyaltyObjects: [{ id: loyaltyObject.id }]
        }
      };

      const token = await authClient.sign(claims);
      const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

      return { saveUrl };
    } catch (error) {
      console.error('Error detallado al generar pase Google:', error);
      throw new Error(`Error al generar pase Google: ${error.message}`);
    }
  }

  getNextReward(visits) {
    if (visits < 5) return "Postre gratis";
    if (visits < 10) return "Bebida gratis";
    if (visits < 15) return "Gel liso en manos";
    if (visits < 20) return "Gel liso en pies";
    return "10% descuento en uñas";
  }
}