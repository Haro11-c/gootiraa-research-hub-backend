import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_development_secret_change_in_production_32chars',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(','),
  },
  storage: {
    uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10),
  },
  ai: {
    provider: process.env.AI_PROVIDER || 'internal_grounded',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
  },
  scholarly: {
    openAlexEmail: process.env.OPENALEX_EMAIL || 'contact@gootiraa.org',
    openAlexApiKey: process.env.OPENALEX_API_KEY || '',
    crossrefMailto: process.env.CROSSREF_MAILTO || 'contact@gootiraa.org',
    semanticScholarApiKey: process.env.SEMANTIC_SCHOLAR_API_KEY || '',
  },
};
