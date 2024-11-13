// src/services/passSigningService.js
import fs from 'fs/promises';
import { createWriteStream, createReadStream } from 'fs';
import path from 'path';
import crypto from 'crypto';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class PassSigningService {
  constructor() {
    this.certsPath = process.env.NODE_ENV === 'production'
      ? path.join(process.cwd(), 'config/certificates')
      : process.env.PASS_CERTIFICATES_PATH;
  }

  async createManifest(passDirectory) {
    try {
      const manifest = {};
      const files = await fs.readdir(passDirectory);

      // Procesar archivos en orden específico para consistencia
      const fileOrder = ['pass.json', 'icon.png', 'logo.png', 'strip.png'];
      
      for (const fileName of fileOrder) {
        if (files.includes(fileName)) {
          const filePath = path.join(passDirectory, fileName);
          const fileBuffer = await fs.readFile(filePath);
          const hash = crypto.createHash('sha1');
          hash.update(fileBuffer);
          manifest[fileName] = hash.digest('hex');
        }
      }

      const manifestPath = path.join(passDirectory, 'manifest.json');
      await fs.writeFile(manifestPath, JSON.stringify(manifest));
      return manifestPath;
    } catch (error) {
      console.error('Error creating manifest:', error);
      throw error;
    }
  }

  async signManifest(manifestPath) {
    try {
      const certPath = path.join(this.certsPath, 'pass.cer');
      const keyPath = path.join(this.certsPath, 'pass.key');
      const wwdrPath = path.join(this.certsPath, 'wwdr.pem');
      const signaturePath = path.join(dirname(manifestPath), 'signature');

      // Usar OpenSSL directamente para la firma PKCS#7
      const command = `openssl smime -binary -sign \
        -signer "${certPath}" \
        -inkey "${keyPath}" \
        -certfile "${wwdrPath}" \
        -in "${manifestPath}" \
        -out "${signaturePath}" \
        -outform DER`;

      execSync(command);
      return signaturePath;

    } catch (error) {
      console.error('Error signing manifest:', error);
      throw error;
    }
  }

  async createPassPackage(passDirectory, serialNumber) {
    try {
      const outputPath = path.join(passDirectory, `${serialNumber}.pkpass`);
      
      return new Promise(async (resolve, reject) => {
        try {
          // Crear y firmar el manifest primero
          await this.createManifest(passDirectory);
          await this.signManifest(path.join(passDirectory, 'manifest.json'));

          const output = createWriteStream(outputPath);
          const archive = archiver('zip', {
            zlib: { level: 9 }
          });

          output.on('close', () => resolve(outputPath));
          archive.on('error', reject);
          archive.pipe(output);

          // Añadir archivos en el orden correcto
          const fileOrder = [
            'manifest.json',
            'signature',
            'pass.json',
            'icon.png',
            'logo.png',
            'strip.png'
          ];

          for (const fileName of fileOrder) {
            const filePath = path.join(passDirectory, fileName);
            try {
              await fs.access(filePath);
              archive.file(filePath, { name: fileName });
            } catch (error) {
              console.error(`Archivo no encontrado: ${fileName}`, error);
            }
          }

          await archive.finalize();
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      console.error('Error creating pass package:', error);
      throw error;
    }
  }
}