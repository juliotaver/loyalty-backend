// backend/src/services/passPushService.js
import jwt from 'jsonwebtoken';
import https from 'https';
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
    try {
      console.log('Enviando push a token:', pushToken);

      return new Promise((resolve, reject) => {
        const options = {
          method: 'POST',
          host: 'api.push.apple.com',
          path: `/3/device/${pushToken}`,
          headers: {
            'apns-topic': this.passTypeId,
            'apns-push-type': 'background'
          }
        };

        console.log('Opciones de push:', options);

        const req = https.request(options, (res) => {
          console.log('Push status:', res.statusCode);
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`Push failed with status ${res.statusCode}`));
          }
        });

        req.on('error', (error) => {
          console.error('Error en push request:', error);
          reject(error);
        });

        req.write(JSON.stringify({}));
        req.end();
      });
    } catch (error) {
      console.error('Error en pushUpdate:', error);
      throw error;
    }
  }
}