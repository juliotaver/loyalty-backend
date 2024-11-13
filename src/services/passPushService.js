// backend/src/services/passPushService.js
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs/promises';
import https from 'https';

export class PassPushService {
  constructor() {
    this.teamId = process.env.TEAM_IDENTIFIER;
    this.passTypeId = process.env.PASS_TYPE_IDENTIFIER;
    this.keyId = process.env.APPLE_KEY_ID; // Necesitaremos añadir esto a las variables de entorno
    this.certsPath = process.env.NODE_ENV === 'production'
      ? path.join(process.cwd(), 'config/certificates')
      : process.env.PASS_CERTIFICATES_PATH;
  }

  async pushUpdate(pushToken) {
    try {
      const token = await this.generateAuthToken();
      
      return new Promise((resolve, reject) => {
        const options = {
          method: 'POST',
          host: 'api.push.apple.com',
          path: `/3/device/${pushToken}`,
          headers: {
            'authorization': `bearer ${token}`,
            'apns-topic': this.passTypeId,
            'apns-push-type': 'background'
          }
        };

        const req = https.request(options, (res) => {
          console.log('Push notification status:', res.statusCode);
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`Push failed with status ${res.statusCode}`));
          }
        });

        req.on('error', reject);
        req.write(JSON.stringify({}));
        req.end();
      });
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  async generateAuthToken() {
    try {
      const key = await fs.readFile(path.join(this.certsPath, 'AuthKey.p8'));
      
      const token = jwt.sign({}, key, {
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
      console.error('Error generating auth token:', error);
      throw error;
    }
  }
}