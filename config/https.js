const fs = require('fs');
const path = require('path');

function configureHttps() {
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  try {
    const keyPath = process.env.SSL_KEY_PATH || path.join(__dirname, '../ssl/private.key');
    const certPath = process.env.SSL_CERT_PATH || path.join(__dirname, '../ssl/certificate.crt');
    const caPath = process.env.SSL_CA_PATH;
    const options = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
    if (caPath && fs.existsSync(caPath)) {
      options.ca = fs.readFileSync(caPath);
    }
    return options;
  } catch (error) {
    console.warn('⚠️ Certificats SSL non trouvés, le serveur fonctionnera en HTTP');
    return null;
  }
}

module.exports = { configureHttps };
