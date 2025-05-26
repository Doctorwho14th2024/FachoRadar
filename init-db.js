const Database = require('better-sqlite3');
const db = new Database('database.db');

// Création de la table fachos
db.exec(`
  CREATE TABLE IF NOT EXISTS fachos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pseudo TEXT NOT NULL,
    lien TEXT NOT NULL,
    preuve TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('✅ Base de données initialisée avec succès');
