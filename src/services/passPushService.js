// backend/src/services/passPushService.js
import http2 from 'http2';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class PassPushService {
  constructor() {
    this.teamId = process.env.TEAM_IDENTIFIER;
    this.passTypeId = process.env.PASS_TYPE_IDENTIFIER;
    this.keyId = process.env.APPLE_KEY_ID;
    this.certsPath = process.env.NODE_ENV === 'production'
      ? path.join(process.cwd(), 'config/certificates')
      : process.env.PASS_CERTIFICATES_PATH;
  }

  async generateToken() {
    try {
      const privateKey = await fs.readFile(path.join(this.certsPath, 'push.p8'));
      
      const token = jwt.sign({}, privateKey, {
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
        console.log('Generando token JWT para push...');
        const token = await this.generateToken();
        
        console.log('Conectando a Apple Push Service...');
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
          ...headers,
          authorization: 'bearer [TOKEN]' // Ocultar token en logs
        });

        const req = client.request(headers);

        req.on('response', (headers) => {
          console.log('Respuesta push:', {
            status: headers[':status'],
            headers
          });
          
          if (headers[':status'] === 200) {
            resolve();
          } else {
            reject(new Error(`Push falló con status ${headers[':status']}`));
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