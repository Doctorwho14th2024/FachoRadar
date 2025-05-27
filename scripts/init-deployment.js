const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateSecureKey(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function initDeployment() {
  console.log('🚀 Initialisation du déploiement...');
  
  // Générer les clés de sécurité
  const jwtSecret = generateSecureKey();
  const apiKey = generateSecureKey();

  // Créer le fichier .env.production s'il n'existe pas
  const envContent = `# Configuration générale
NODE_ENV=production
JWT_SECRET=${jwtSecret}
API_KEY=${apiKey}

# Configuration du serveur
PORT=3000
HTTPS_PORT=443
FORCE_SSL=false

# Configuration des origines CORS
CORS_ORIGIN=https://votre-domaine.com

# Configuration SSL (pour l'auto-hébergement)
SSL_KEY_PATH=./ssl/private.key
SSL_CERT_PATH=./ssl/certificate.crt
SSL_CA_PATH=./ssl/ca_bundle.crt

# Configuration de la base de données
DB_PATH=./database.db
`;

  try {
    fs.writeFileSync('.env.production', envContent);
    console.log('✅ Fichier .env.production créé avec succès');
    
    // Créer le dossier ssl s'il n'existe pas
    if (!fs.existsSync('ssl')) {
      fs.mkdirSync('ssl');
      console.log('✅ Dossier SSL créé');
    }
    
    console.log('\n📝 Configuration terminée !');
    console.log('\nProchaines étapes :');
    console.log('1. Pour Railway.app :');
    console.log('   - Exécutez : npm run deploy:railway');
    console.log('\n2. Pour l\'auto-hébergement :');
    console.log('   - Modifiez FORCE_SSL=true dans .env.production');
    console.log('   - Exécutez : npm run deploy:setup-ssl');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
}

initDeployment();
