// backend/src/services/googlePassService.js
import { GoogleAuth } from 'google-auth-library';
import { JWT } from 'google-auth-library';

export class GooglePassService {
  constructor() {
    this.issuerId = process.env.GOOGLE_ISSUER_ID;
    this.credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    };
    this.auth = new JWT({
      email: this.credentials.client_email,
      key: this.credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
    });
  }

  async generatePass(client) {
    try {
      const loyaltyObject = {
        id: `${this.issuerId}.${client.passSerialNumber}`,
        classId: `${this.issuerId}.loyalty_class`,
        state: 'ACTIVE',
        loyaltyPoints: {
          balance: {
            int: client.visits
          },
          label: 'Visitas'
        },
        textModulesData: [
          {
            header: 'Próxima Recompensa',
            body: this.getNextReward(client.visits)
          }
        ],
        linksModuleData: {
          uris: [
            {
              uri: 'https://leubeauty.com',
              description: 'Sitio Web'
            }
          ]
        },
        accountName: client.name,
        accountId: client.email
      };

      const response = await fetch(
        `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await this.auth.authorize()).access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(loyaltyObject)
        }
      );

      if (!response.ok) {
        throw new Error(`Error creando objeto: ${response.statusText}`);
      }

      const jwt = {
        iss: this.credentials.client_email,
        aud: 'google',
        typ: 'savetowallet',
        payload: {
          loyaltyObjects: [{
            id: loyaltyObject.id
          }]
        }
      };

      const token = await this.auth.sign(jwt);
      
      return {
        saveUrl: `https://pay.google.com/gp/v/save/${token}`
      };
    } catch (error) {
      console.error('Error generando pase Google:', error);
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