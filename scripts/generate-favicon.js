const sharp = require('sharp');
const fs = require('fs');

// Lire le SVG
fs.readFile('public/img/favicon.svg', (err, data) => {
  if (err) throw err;
  
  // Convertir en PNG
  sharp(data)
    .resize(32, 32)
    .png()
    .toFile('public/img/favicon.png')
    .then(() => console.log('✅ Favicon PNG généré'))
    .catch(err => console.error('Erreur:', err));
});
