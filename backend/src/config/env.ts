import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE any other imports
// En producción, el .env está en backend/.env
const envPath = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, '../../.env')  // desde backend/dist/ -> backend/.env
  : path.join(__dirname, '../../../backend/.env'); // desarrollo

dotenv.config({ path: envPath });

// Verify required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY no está configurada. Algunas funcionalidades no estarán disponibles.');
}

export default {};
