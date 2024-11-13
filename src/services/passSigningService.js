// src/services/passSigningService.js
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import crypto from 'crypto';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class PassSigningService {
  constructor() {
    // Usar rutas absolutas basadas en el directorio del proyecto
    this.certsPath = process.env.NODE_ENV === 'production'
      ? path.join(process.cwd(), 'config/certificates')
      : process.env.PASS_CERTIFICATES_PATH;
    
    console.log('Certificates path:', this.certsPath);
  }

  async createManifest(passDirectory) {
    try {
      const manifest = {};
      const files = await fs.readdir(passDirectory);

      // Procesar archivos en orden específico
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
      if (!manifestPath) {
        throw new Error('manifestPath is required');
      }

      const manifest = await fs.readFile(manifestPath);
      const signaturePath = path.join(dirname(manifestPath), 'signature');

      // Verificar que los certificados existen
      const certPath = path.join(this.certsPath, 'pass.cer');
      const keyPath = path.join(this.certsPath, 'pass.key');
      const wwdrPath = path.join(this.certsPath, 'wwdr.pem');

      // Log de verificación
      console.log('Verificando certificados:');
      console.log('Cert path:', certPath);
      console.log('Key path:', keyPath);
      console.log('WWDR path:', wwdrPath);

      // Leer certificados
      const [cert, key, wwdr] = await Promise.all([
        fs.readFile(certPath),
        fs.readFile(keyPath),
        fs.readFile(wwdrPath)
      ]);

      // Crear la firma
      const sign = crypto.createSign('sha1WithRSAEncryption');
      sign.update(manifest);
      const signature = sign.sign({
        key: key,
        cert: cert
      });

      await fs.writeFile(signaturePath, signature);
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
            'pass.json',
            'manifest.json',
            'signature',
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
              console.error(`Error adding ${fileName} to archive:`, error);
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