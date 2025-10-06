import dotenv from 'dotenv';

// Load environment variables BEFORE any other imports
dotenv.config();

// Verify required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY no está configurada. Algunas funcionalidades no estarán disponibles.');
}

export default {};
