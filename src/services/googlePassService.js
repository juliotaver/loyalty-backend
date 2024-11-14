// backend/src/services/googlePassService.js
import { GoogleAuth, JWT } from 'google-auth-library';
import jsonwebtoken from 'jsonwebtoken';

export class GooglePassService {
  constructor() {
    this.issuerId = process.env.GOOGLE_ISSUER_ID;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    this.credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey
    };

    console.log('Inicializando con:', {
      issuerId: this.issuerId,
      hasEmail: !!this.credentials.client_email,
      hasKey: !!this.credentials.private_key
    });
  }

  async generatePass(client) {
    try {
      console.log('Generando pase Google para:', client.email);

      // Usar JWT directamente en lugar de GoogleAuth
      const token = jsonwebtoken.sign(
        {
          iss: this.credentials.client_email,
          aud: 'https://www.googleapis.com/oauth2/v4/token',
          scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000)
        },
        this.credentials.private_key,
        { algorithm: 'RS256' }
      );

      const response = await fetch('https://www.googleapis.com/oauth2/v4/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: token
        })
      });

      const { access_token } = await response.json();

      const loyaltyObject = {
        id: `${this.issuerId}.${client.passSerialNumber}`,
        classId: `${this.issuerId}.loyalty_class`,
        state: 'ACTIVE',
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

      // Crear el objeto de lealtad
      const objectResponse = await fetch('https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loyaltyObject)
      });

      if (!objectResponse.ok) {
        throw new Error(`Error creando objeto: ${await objectResponse.text()}`);
      }

      // Generar JWT para el botón "Añadir a Google Wallet"
      const claims = {
        iss: this.credentials.client_email,
        aud: 'google',
        origins: ['https://loyalty-frontend-iota.vercel.app'],
        typ: 'savetowallet',
        payload: {
          loyaltyObjects: [{ id: loyaltyObject.id }]
        }
      };

      const saveToken = jsonwebtoken.sign(claims, this.credentials.private_key, { algorithm: 'RS256' });
      const saveUrl = `https://pay.google.com/gp/v/save/${saveToken}`;

      console.log('Pase generado exitosamente:', { saveUrl });
      
      return { saveUrl };
    } catch (error) {
      console.error('Error detallado al generar pase Google:', error);
      throw error;
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