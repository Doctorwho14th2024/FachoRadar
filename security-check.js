const fs = require('fs');
const path = require('path');

function validateEnvironment() {
    const requiredVars = [
    'JWT_SECRET',
    'API_KEY',
    'NODE_ENV',
    'CORS_ORIGIN'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Variables d\'environnement manquantes:', missingVars.join(', '));
    console.error('Copiez .env.example vers .env et configurez les valeurs appropriées');
    process.exit(1);
  }

  // Vérification de la force des secrets
  if (process.env.JWT_SECRET?.length < 32) {
    console.error('❌ JWT_SECRET doit faire au moins 32 caractères');
    process.exit(1);
  }

  if (process.env.API_KEY?.length < 32) {
    console.error('❌ API_KEY doit faire au moins 32 caractères');
    process.exit(1);
  }

  // Vérification des permissions de la base de données
  const dbPath = process.env.DB_PATH || './database.db';
  if (fs.existsSync(dbPath)) {
    try {
      const stats = fs.statSync(dbPath);
      const permissions = stats.mode & 0o777;
      if (permissions > 0o600) {
        console.warn('⚠️ Attention: Les permissions de la base de données sont trop permissives');
        if (process.env.NODE_ENV === 'production') {
          console.error('❌ En production, la base de données doit avoir des permissions restreintes (600)');
          process.exit(1);
        }
      }
    } catch (err) {
      console.error('❌ Impossible de vérifier les permissions de la base de données:', err);
      process.exit(1);
    }
  }

    console.log('✅ Vérification de sécurité réussie');
    return true;
  }

module.exports = { validateEnvironment };
