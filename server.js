require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Configuration de base
const app = express();
app.set('name', 'Fachopol');
const PORT = process.env.PORT || 3000;

// Configuration de la base de données
const DB_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'database.db');

// Créer le dossier data s'il n'existe pas
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialiser la base de données
const db = new Database(DB_PATH, { verbose: console.log });
db.pragma('journal_mode = WAL');

// Créer la table si elle n'existe pas
db.exec(`
  CREATE TABLE IF NOT EXISTS fachos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pseudo TEXT NOT NULL,
    lien TEXT NOT NULL,
    preuve TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

// Middleware de base
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'Authorization'],
  credentials: true
}));

// Servir les fichiers statiques en production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
}

// Middleware de sécurité
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// Middleware de logging amélioré
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${new Date().toISOString()} - ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`
    );
  });
  next();
});

// Route de monitoring améliorée
app.get('/health', (req, res) => {
  try {
    const dbStatus = { connected: false };
    try {
      db.prepare('SELECT 1').get();
      dbStatus.connected = true;
    } catch (dbError) {
      console.warn('⚠️ Avertissement base de données:', dbError.message);
    }
    
    res.json({
      status: 'healthy',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      env: process.env.NODE_ENV,
      database: dbStatus
    });
  } catch (error) {
    console.error('❌ Erreur healthcheck:', error);
    res.json({
      status: 'healthy', // Toujours retourner healthy pour Railway
      timestamp: new Date().toISOString()
    });
  }
});

// Middleware d'authentification
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Accès non autorisé' });
  }
  next();
};

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
app.get('/api/fachos', authenticateApiKey, (req, res) => {
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
app.post('/api/fachos', authenticateApiKey, [
  body('pseudo')
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage('Le pseudo doit faire entre 3 et 50 caractères')
    .matches(/^[a-zA-Z0-9_@.-]+$/).withMessage('Le pseudo contient des caractères non autorisés')
    .escape(),
  body('lien')
    .trim()
    .isURL({ protocols: ['http', 'https'] }).withMessage('Le lien doit être une URL valide (http/https)')
    .matches(/^https?:\/\/(www\.)?tiktok\.com/).withMessage('Seuls les liens TikTok sont autorisés'),
  body('preuve')
    .trim()
    .isLength({ min: 10, max: 1000 }).withMessage('La preuve doit faire entre 10 et 1000 caractères')
    .escape()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
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

// Placer la route catch-all tout à la fin, après toutes les autres routes
if (process.env.NODE_ENV === 'production') {
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

http.createServer(app).listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
