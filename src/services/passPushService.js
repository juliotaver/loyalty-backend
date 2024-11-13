// backend/src/services/passPushService.js
import http2 from 'http2';
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

  async pushUpdate(pushToken) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('Enviando push a token:', pushToken);

        const client = http2.connect('https://api.push.apple.com');

        client.on('error', (err) => {
          console.error('Error en conexión HTTP/2:', err);
          reject(err);
        });

        const req = client.request({
          ':method': 'POST',
          ':path': `/3/device/${pushToken}`,
          'apns-topic': this.passTypeId,
          'apns-push-type': 'background',
          'content-type': 'application/json',
        });

        req.on('response', (headers) => {
          console.log('Respuesta push:', headers[':status']);
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

        // Payload vacío para actualización de background
        const payload = JSON.stringify({
          aps: {
            'content-available': 1
          }
        });

        req.end(payload);

        // Cerrar la conexión después de enviar
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