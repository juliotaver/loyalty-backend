import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import crypto from 'crypto';
import archiver from 'archiver';
import { execSync } from 'child_process';
import { getTempPath } from '../utils/paths.js';

export class PassSigningService {
  constructor() {
    this.certsPath = process.env.PASS_CERTIFICATES_PATH;
  }

  async createManifest(passDirectory) {
    const manifest = {};
    const fileOrder = ['pass.json', 'icon.png', 'logo.png', 'strip.png'];
    
    for (const fileName of fileOrder) {
      const filePath = path.join(passDirectory, fileName);
      const fileBuffer = await fs.readFile(filePath);
      const hash = crypto.createHash('sha1');
      hash.update(fileBuffer);
      manifest[fileName] = hash.digest('hex');
    }

    const manifestPath = path.join(passDirectory, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest));
    return manifestPath;
  }

  async signManifest(manifestPath) {
    const passDirectory = path.dirname(manifestPath);
    const signaturePath = path.join(passDirectory, 'signature');

    try {
      // Usamos OpenSSL directamente para generar la firma PKCS#7
      execSync(`openssl smime -sign -signer "${path.join(this.certsPath, 'pass.cer')}" \
        -inkey "${path.join(this.certsPath, 'pass.key')}" \
        -certfile "${path.join(this.certsPath, 'wwdr.pem')}" \
        -in "${manifestPath}" \
        -out "${signaturePath}" \
        -outform DER -binary`);

      return signaturePath;
    } catch (error) {
      console.error('Error al firmar el manifest:', error);
      throw error;
    }
  }

  async createPassPackage(passDirectory, serialNumber) {
    try {
      const outputPath = path.join(passDirectory, `${serialNumber}.pkpass`);
      
      return new Promise(async (resolve, reject) => {
        const output = createWriteStream(outputPath);
        const archive = archiver('zip', {
          zlib: { level: 9 }
        });

        output.on('close', () => resolve(outputPath));
        archive.on('error', reject);
        archive.pipe(output);

        // Crear y firmar el manifest
        await this.createManifest(passDirectory);
        await this.signManifest(path.join(passDirectory, 'manifest.json'));

        // Añadir archivos en orden específico
        const fileOrder = [
          'signature',
          'manifest.json',
          'pass.json',
          'icon.png',
          'logo.png',
          'strip.png'
        ];

        for (const fileName of fileOrder) {
          const filePath = path.join(passDirectory, fileName);
          if (await fs.access(filePath).then(() => true).catch(() => false)) {
            archive.file(filePath, { name: fileName });
          }
        }

        await archive.finalize();
      });
    } catch (error) {
      console.error('Error al crear el paquete del pase:', error);
      throw error;
    }
  }
}
