import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const getTempPath = (serialNumber) => {
  return path.join(dirname(__dirname), 'temp', serialNumber);
};
