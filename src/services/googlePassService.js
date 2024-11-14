// backend/src/services/googlePassService.js
import jsonwebtoken from 'jsonwebtoken';

export class GooglePassService {
  constructor() {
    this.issuerId = process.env.GOOGLE_ISSUER_ID;
    
    // Formatear correctamente la clave privada
    try {
      // Asegurarse de que la clave tenga el formato correcto
      let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
      
      // Si la clave no tiene los delimitadores, añadirlos
      if (!privateKey.includes('BEGIN PRIVATE KEY')) {
        privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`;
      }
      
      // Reemplazar los \n literales por saltos de línea reales
      this.privateKey = privateKey.replace(/\\n/g, '\n');
      
      this.clientEmail = process.env.GOOGLE_CLIENT_EMAIL;

      console.log('Clave privada formateada:', {
        hasDelimiters: this.privateKey.includes('BEGIN PRIVATE KEY'),
        length: this.privateKey.length,
        email: this.clientEmail,
        issuerId: this.issuerId
      });
    } catch (error) {
      console.error('Error al formatear la clave privada:', error);
      throw error;
    }
  }

  async generatePass(client) {
    try {
      console.log('Generando pase Google para:', client.email);

      // Crear el JWT para autenticación
      const jwtClaims = {
        iss: this.clientEmail,
        scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
        aud: 'https://oauth2.googleapis.com/token',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
      };

      // Firmar el JWT
      const signedJwt = jsonwebtoken.sign(jwtClaims, this.privateKey, {
        algorithm: 'RS256',
        header: {
          "alg": "RS256",
          "typ": "JWT"
        }
      });

      // Obtener el token de acceso
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          'assertion': signedJwt
        })
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Error al obtener token:', error);
        throw new Error(`Error al obtener token: ${error}`);
      }

      const { access_token } = await tokenResponse.json();

      // Crear el objeto de lealtad
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
        barcode: {
          type: "QR_CODE",
          value: client.passSerialNumber
        }
      };

      // Crear el JWT para el botón de guardar
      const saveJwt = jsonwebtoken.sign({
        iss: this.clientEmail,
        aud: 'google',
        typ: 'savetowallet',
        iat: Math.floor(Date.now() / 1000),
        payload: {
          loyaltyObjects: [{
            id: loyaltyObject.id,
            classId: loyaltyObject.classId
          }]
        }
      }, this.privateKey, { algorithm: 'RS256' });

      return {
        saveUrl: `https://pay.google.com/gp/v/save/${saveJwt}`
      };

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