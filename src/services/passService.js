// src/services/passService.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class PassService {
  constructor() {
    this.passTypeId = process.env.PASS_TYPE_IDENTIFIER;
    this.teamId = process.env.TEAM_IDENTIFIER;
    // Usar rutas absolutas basadas en el directorio del proyecto
    this.certsPath = process.env.NODE_ENV === 'production' 
      ? path.join(process.cwd(), 'config/certificates')
      : process.env.PASS_CERTIFICATES_PATH;
    this.imagesPath = process.env.NODE_ENV === 'production'
      ? path.join(process.cwd(), 'config/images')
      : process.env.PASS_IMAGES_PATH;
  }

  async generatePass(client) {
    try {
      const serialNumber = client.passSerialNumber;
      const passData = {
        formatVersion: 1,
        passTypeIdentifier: this.passTypeId,
        serialNumber: serialNumber,
        teamIdentifier: this.teamId,
        webServiceURL: process.env.BACKEND_URL,
        authenticationToken: serialNumber,
        organizationName: "Leu Beauty",
        description: `Tarjeta de Fidelidad - ${client.name}`,
        foregroundColor: "rgb(239, 233, 221)",
        backgroundColor: "rgb(132, 149, 105)",
        labelColor: "rgb(239, 233, 221)",
        storeCard: {
          headerFields: [
            {
              key: "nombre",
              label: "NOMBRE",
              value: client.name,
              textAlignment: "PKTextAlignmentRight"
            }
          ],
          auxiliaryFields: [
            {
              key: "nextReward",
              label: "SIGUIENTE PREMIO",
              value: this.getNextReward(client.visits),
              textAlignment: "PKTextAlignmentCenter"
            }
          ],
          secondaryFields: [
            {
              key: "visits",
              label: "VISITAS",
              value: this.getCurrentProgress(client.visits),
              textAlignment: "PKTextAlignmentCenter"
            }
          ],
          backFields: [
            {
              key: "rewards",
              label: "Programa de Recompensas",
              value: "• 5 visitas: Postre gratis\n• 10 visitas: Bebida gratis\n• 15 visitas: Gel liso en manos\n• 20 visitas: Gel liso en pies\n• 25 visitas: 10% descuento en uñas"
            }
          ]
        },
        barcode: {
          message: serialNumber,
          format: "PKBarcodeFormatQR",
          messageEncoding: "iso-8859-1",
          altText: ":D"
        }
      };

      // Crear directorio temporal para el pase
      const tempDir = path.join(os.tmpdir(), serialNumber);
      await fs.mkdir(tempDir, { recursive: true });

      // Verificar que los directorios existen
      console.log('Certificados path:', this.certsPath);
      console.log('Imágenes path:', this.imagesPath);
      
      // Copiar imágenes al directorio temporal
      const imageFiles = ['icon.png', 'logo.png', 'strip.png'];
      for (const file of imageFiles) {
        const sourcePath = path.join(this.imagesPath, file);
        const targetPath = path.join(tempDir, file);
        try {
          await fs.access(sourcePath);
          await fs.copyFile(sourcePath, targetPath);
        } catch (error) {
          console.error(`Error copiando ${file}:`, error);
          throw new Error(`No se pudo copiar ${file}`);
        }
      }

      // Guardar pass.json
      await fs.writeFile(
        path.join(tempDir, 'pass.json'),
        JSON.stringify(passData, null, 2)
      );

      return tempDir;
    } catch (error) {
      console.error('Error generando el pase:', error);
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

  getCurrentProgress(visits) {
    const nextMilestone = Math.ceil(visits / 5) * 5;
    return `${visits}/${nextMilestone}`;
  }
}