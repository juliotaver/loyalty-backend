// backend/src/services/passPushService.js
import http2 from 'http2';
import jwt from 'jsonwebtoken';

export class PassPushService {
  constructor() {
    this.teamId = process.env.TEAM_IDENTIFIER;
    this.passTypeId = process.env.PASS_TYPE_IDENTIFIER;
    this.keyId = process.env.APPLE_KEY_ID;
    
    // Decodificar la clave base64
    const base64Key = process.env.APPLE_PUSH_KEY;
    this.privateKey = base64Key ? Buffer.from(base64Key, 'base64').toString() : null;

    if (!this.privateKey) {
      console.error('APPLE_PUSH_KEY no está configurada');
    }

    console.log('PassPushService inicializado:', {
      teamId: this.teamId,
      passTypeId: this.passTypeId,
      keyId: this.keyId,
      hasPrivateKey: !!this.privateKey
    });
  }

  async generateToken() {
    try {
      if (!this.privateKey) {
        throw new Error('APPLE_PUSH_KEY no está configurada');
      }

      const token = jwt.sign({}, this.privateKey, {
        algorithm: 'ES256',
        header: {
          alg: 'ES256',
          kid: this.keyId
        },
        issuer: this.teamId,
        expiresIn: '1h'
      });

      return token;
    } catch (error) {
      console.error('Error generando token:', error);
      throw error;
    }
  }

  async pushUpdate(pushToken) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('Iniciando push update para token:', pushToken);
        
        const token = await this.generateToken();
        console.log('Token JWT generado exitosamente');
        
        const client = http2.connect('https://api.push.apple.com');

        client.on('error', (err) => {
          console.error('Error en conexión HTTP/2:', err);
          reject(err);
        });

        const headers = {
          ':method': 'POST',
          ':path': `/3/device/${pushToken}`,
          'authorization': `bearer ${token}`,
          'apns-topic': this.passTypeId,
          'apns-push-type': 'background',
          'content-type': 'application/json',
        };

        console.log('Enviando push con headers:', {
          ':method': headers[':method'],
          ':path': headers[':path'],
          'apns-topic': headers['apns-topic'],
          'apns-push-type': headers['apns-push-type']
        });

        const req = client.request(headers);

        req.on('response', (headers) => {
          const status = headers[':status'];
          console.log('Respuesta de push:', {
            status,
            apnsId: headers['apns-id']
          });
          
          if (status === 200) {
            console.log('Push enviado exitosamente');
            resolve();
          } else {
            const error = new Error(`Push falló con status ${status}`);
            console.error('Push falló:', {
              status,
              apnsId: headers['apns-id'],
              reason: headers['reason']
            });
            reject(error);
          }
        });

        req.on('error', (error) => {
          console.error('Error en request:', error);
          reject(error);
        });

        const payload = JSON.stringify({
          aps: {
            'content-available': 1
          }
        });

        req.end(payload);

        req.on('end', () => {
          client.close();
        });

      } catch (error) {
        console.error('Error en pushUpdate:', error);
        reject(error);
      }
    });
  }
}