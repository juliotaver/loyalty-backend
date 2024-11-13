import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getTempPath } from '../utils/paths.js';

export class PassService {
  constructor() {
    this.passTypeId = process.env.PASS_TYPE_IDENTIFIER;
    this.teamId = process.env.TEAM_IDENTIFIER;
    this.certsPath = process.env.PASS_CERTIFICATES_PATH;
    this.imagesPath = process.env.PASS_IMAGES_PATH;
  }

  generateSerialNumber() {
    return crypto.randomBytes(10).toString('hex');
  }

  getNextReward(visits) {
    if (visits < 5) return "Postre Gratis";
    if (visits < 10) return "Bebida Gratis";
    if (visits < 15) return "Gel liso en manos";
    if (visits < 20) return "Gel liso en pies";
    return "10% descuento en uñas";
  }

  getCurrentProgress(visits) {
    const nextMilestone = Math.ceil(visits / 5) * 5;
    return `${visits}/${nextMilestone}`;
  }

  async generatePass(client) {
    const serialNumber = client.passSerialNumber || this.generateSerialNumber();
    const passData = {
      formatVersion: 1,
      passTypeIdentifier: this.passTypeId,
      serialNumber: serialNumber,
      teamIdentifier: this.teamId,
      webServiceURL: "https://api.leubeautylab.com/v1",
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
    const tempPassDir = getTempPath(serialNumber);
    await fs.mkdir(tempPassDir, { recursive: true });

    // Copiar imágenes al directorio temporal
    await Promise.all([
      fs.copyFile(
        path.join(this.imagesPath, 'icon.png'),
        path.join(tempPassDir, 'icon.png')
      ),
      fs.copyFile(
        path.join(this.imagesPath, 'logo.png'),
        path.join(tempPassDir, 'logo.png')
      ),
      fs.copyFile(
        path.join(this.imagesPath, 'strip.png'),
        path.join(tempPassDir, 'strip.png')
      )
    ]);

    // Guardar pass.json
    await fs.writeFile(
      path.join(tempPassDir, 'pass.json'),
      JSON.stringify(passData)
    );

    return tempPassDir;
  }
}