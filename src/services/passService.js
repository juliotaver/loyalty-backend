// src/services/passService.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// backend/src/services/passService.js
export class PassService {
  constructor() {
    this.passTypeId = process.env.PASS_TYPE_IDENTIFIER;
    this.teamId = process.env.TEAM_IDENTIFIER;
    this.certsPath = process.env.NODE_ENV === 'production'
      ? path.join(process.cwd(), 'config/certificates')
      : process.env.PASS_CERTIFICATES_PATH;
  }

  async generatePass(client) {
    try {
      const serialNumber = client.passSerialNumber;
      const webServiceUrl = `${process.env.BACKEND_URL}/api`;
      
      console.log('Generando pass con configuración:', {
        passTypeId: this.passTypeId,
        teamId: this.teamId,
        serialNumber,
        webServiceUrl
      });

      const passData = {
        formatVersion: 1,
        passTypeIdentifier: this.passTypeId,
        serialNumber: serialNumber,
        teamIdentifier: this.teamId,
        webServiceURL: webServiceUrl,  // URL base para las APIs de registro
        authenticationToken: serialNumber,  // Token de autenticación
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
              value: `${client.visits}/5`,
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

      console.log('Pass.json generado:', JSON.stringify(passData, null, 2));

      // Crear directorio temporal para el pase
      const tempDir = path.join(os.tmpdir(), serialNumber);
      await fs.mkdir(tempDir, { recursive: true });

      // Copiar imágenes
      const imageFiles = ['icon.png', 'logo.png', 'strip.png'];
      for (const file of imageFiles) {
        const sourcePath = path.join(this.imagesPath, file);
        const targetPath = path.join(tempDir, file);
        await fs.copyFile(sourcePath, targetPath);
      }

      // Guardar pass.json
      await fs.writeFile(
        path.join(tempDir, 'pass.json'),
        JSON.stringify(passData)
      );

      return tempDir;
    } catch (error) {
      console.error('Error generando el pase:', error);
      throw error;
    }
  }
}
