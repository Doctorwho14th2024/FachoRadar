const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
const db = new Database('database.db');

// Middleware de logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Création de la table si elle n'existe pas
db.exec(`
  CREATE TABLE IF NOT EXISTS fachos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pseudo TEXT NOT NULL,
    lien TEXT NOT NULL,
    preuve TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Configuration CORS détaillée
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({ 
    error: 'Erreur serveur',
    details: err.message
  });
});

// Récupérer tous les fachos
app.get('/api/fachos', (req, res) => {
  try {
    console.log('Tentative de récupération des données...')
    const fachos = db.prepare('SELECT * FROM fachos ORDER BY created_at DESC').all();
    console.log(`✅ ${fachos.length} enregistrements trouvés`);
    res.json(fachos);
  } catch (error) {
    console.error('Erreur de base de données:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des données',
      details: error.message
    });
  }
});

// Ajouter un nouveau facho
app.post('/api/fachos', (req, res) => {
  const { pseudo, lien, preuve } = req.body;
  
  if (!pseudo || !lien || !preuve) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  try {
    const insert = db.prepare('INSERT INTO fachos (pseudo, lien, preuve) VALUES (?, ?, ?)');
    const result = insert.run(pseudo, lien, preuve);
    
    res.status(201).json({
      id: result.lastInsertRowid,
      pseudo,
      lien,
      preuve,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
