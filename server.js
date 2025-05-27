require('dotenv').config();
const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const Database = require('better-sqlite3');
const { validateEnvironment } = require('./security-check');
const { configureHttps } = require('./config/https');

// Vérification de la sécurité au démarrage
validateEnvironment();
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

const app = express();
app.set('name', 'Fachopol');
const db = new Database('database.db');

const path = require('path');

// Servir les fichiers statiques en production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
}

// Configuration du limiteur de requêtes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limite chaque IP à 100 requêtes par fenêtre
});

// Middleware de sécurité
app.use(helmet()); // Sécurité des en-têtes HTTP
app.use(limiter); // Protection contre les attaques par force brute

// Route de monitoring
app.get('/health', (req, res) => {
  try {
    // Vérifier la connexion à la base de données
    db.prepare('SELECT 1').get();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
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
  origin: ['http://localhost:3001', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'Authorization'],
  credentials: true
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

const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;

// Créer le serveur HTTP qui ne fait que rediriger vers HTTPS en production
if (process.env.NODE_ENV === 'production') {
  http.createServer((req, res) => {
    const host = req.headers['host'] ? req.headers['host'].replace(/:\d+$/, ':' + HTTPS_PORT) : '';
    res.writeHead(301, { Location: `https://${host}${req.url}` });
    res.end();
  }).listen(PORT, () => {
    console.log(`Redirection HTTP -> HTTPS en place sur http://localhost:${PORT}`);
  });
} else {
  // En dev, le serveur HTTP sert l'app normalement
  http.createServer(app).listen(PORT, () => {
    console.log(`Serveur HTTP (dev) sur http://localhost:${PORT}`);
  });
}

// Configuration HTTPS pour la production
const httpsOptions = configureHttps();
if (httpsOptions && process.env.NODE_ENV === 'production') {
  const httpsServer = https.createServer(httpsOptions, app);
  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`Serveur HTTPS démarré sur https://localhost:${HTTPS_PORT}`);
  });
  
  // Rediriger HTTP vers HTTPS en production
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Placer la route catch-all tout à la fin, après toutes les autres routes
if (process.env.NODE_ENV === 'production') {
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}
