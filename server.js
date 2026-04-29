require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

// Configuration de base
const app = express();
app.set('name', 'Fachopol');
const PORT = process.env.PORT || 3000;
const TRUST_PROXY = process.env.TRUST_PROXY || (process.env.NODE_ENV === 'production' ? '1' : 'false');

if (TRUST_PROXY !== 'false') {
  const trustProxyValue = TRUST_PROXY === 'true'
    ? 1
    : (/^\d+$/.test(TRUST_PROXY) ? Number(TRUST_PROXY) : TRUST_PROXY);
  app.set('trust proxy', trustProxyValue);
}

// Configuration de la base de données
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'database.db');
const DB_DIR = path.dirname(DB_PATH);
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'data', 'uploads');
const VIDEO_UPLOAD_MAX_MB = Number(process.env.VIDEO_UPLOAD_MAX_MB || 5120);
const VIDEO_UPLOAD_MAX_BYTES = VIDEO_UPLOAD_MAX_MB * 1024 * 1024;

// Créer le dossier data s'il n'existe pas
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
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

// Migrations automatiques
try {
  db.exec('ALTER TABLE fachos ADD COLUMN avatar TEXT DEFAULT ""');
} catch(e) { /* La colonne existe déjà */ }

try {
  db.exec('ALTER TABLE fachos ADD COLUMN nickname TEXT DEFAULT ""');
} catch(e) { /* La colonne existe déjà */ }

try {
  db.exec('ALTER TABLE fachos ADD COLUMN status TEXT DEFAULT "a_verifier"');
} catch(e) { /* La colonne existe déjà */ }

try {
  db.exec('ALTER TABLE fachos ADD COLUMN categorie TEXT DEFAULT "autre"');
} catch(e) { /* La colonne existe déjà */ }

try {
  db.exec('ALTER TABLE fachos ADD COLUMN preuve_video TEXT DEFAULT ""');
} catch(e) { /* La colonne existe déjà */ }

try {
  db.exec('ALTER TABLE fachos ADD COLUMN preuve_video_name TEXT DEFAULT ""');
} catch(e) { /* La colonne existe déjà */ }

try {
  db.exec('ALTER TABLE fachos ADD COLUMN preuve_video_type TEXT DEFAULT ""');
} catch(e) { /* La colonne existe déjà */ }

try {
  db.exec('ALTER TABLE fachos ADD COLUMN preuves_videos TEXT DEFAULT "[]"');
} catch(e) { /* La colonne existe déjà */ }

const normalizePseudo = (pseudo = '') => pseudo.trim().replace(/^@+/, '').toLowerCase();
const normalizeStoredVideo = (value = '') => {
  const videoPath = String(value || '').trim();
  if (!videoPath) return '';
  if (!/^\/uploads\/[a-f0-9-]+\.(mp4|webm|mov|m4v)$/i.test(videoPath)) return '';
  return videoPath;
};
const allowedCategories = [
  'propos_haineux',
  'symboles',
  'symboles_identitaires',
  'harcelement',
  'desinformation',
  'apologie',
  'apologie_meurtre',
  'nationalisme',
  'identitaire',
  'supremacisme_blanc',
  'neonazisme',
  'fascisme',
  'neofascisme',
  'traditionalisme',
  'integrisme_religieux',
  'royalisme_extreme_droite',
  'conspirationnisme',
  'masculinisme',
  'accelerationnisme',
  'autre'
];
const allowedVideoTypes = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v'
]);
const videoExtensionsByType = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-m4v': 'm4v'
};
const cleanVideoName = (value = '') => String(value || '')
  .replace(/[^\w .@()_-]/g, '')
  .trim()
  .slice(0, 140);
const decodeVideoName = (value = '') => {
  try {
    return decodeURIComponent(String(value || ''));
  } catch (_) {
    return String(value || '');
  }
};
const videoPayloadFromBody = (bodyPayload = {}, existing = {}) => {
  const requestedVideos = Array.isArray(bodyPayload.preuves_videos)
    ? bodyPayload.preuves_videos
    : null;
  const existingVideos = parseStoredVideos(existing);
  const videos = requestedVideos
    ? requestedVideos
      .map(video => ({
        path: normalizeStoredVideo(video?.path),
        name: cleanVideoName(video?.name) || 'Preuve vidéo',
        type: allowedVideoTypes.has(String(video?.type || '').toLowerCase())
          ? String(video.type).toLowerCase()
          : ''
      }))
      .filter(video => video.path)
    : existingVideos;
  const firstVideo = videos[0] || { path: '', name: '', type: '' };

  return {
    videos,
    videosJson: JSON.stringify(videos),
    preuveVideo: firstVideo.path,
    preuveVideoName: firstVideo.path ? firstVideo.name : '',
    preuveVideoType: firstVideo.path ? firstVideo.type : ''
  };
};
const parseStoredVideos = (row = {}) => {
  try {
    const parsed = JSON.parse(row.preuves_videos || '[]');
    if (Array.isArray(parsed)) {
      const videos = parsed
        .map(video => ({
          path: normalizeStoredVideo(video?.path),
          name: cleanVideoName(video?.name) || 'Preuve vidéo',
          type: allowedVideoTypes.has(String(video?.type || '').toLowerCase())
            ? String(video.type).toLowerCase()
            : ''
        }))
        .filter(video => video.path);
      if (videos.length > 0) return videos;
    }
  } catch (_) {}

  const legacyPath = normalizeStoredVideo(row.preuve_video);
  if (!legacyPath) return [];

  return [{
    path: legacyPath,
    name: cleanVideoName(row.preuve_video_name) || 'Preuve vidéo',
    type: allowedVideoTypes.has(String(row.preuve_video_type || '').toLowerCase())
      ? String(row.preuve_video_type).toLowerCase()
      : ''
  }];
};
const serializeFacho = (row = {}) => {
  const videos = parseStoredVideos(row);
  const firstVideo = videos[0] || { path: '', name: '', type: '' };

  return {
    ...row,
    preuves_videos: videos,
    preuve_video: firstVideo.path,
    preuve_video_name: firstVideo.name,
    preuve_video_type: firstVideo.type
  };
};
const APP_PASSWORD = process.env.APP_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET;
const SESSION_COOKIE = process.env.SESSION_COOKIE || 'fachopol_session';
const SESSION_DURATION_MS = Number(process.env.SESSION_DURATION_MS || 24 * 60 * 60 * 1000);
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || '';
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || 'Lax';
const COOKIE_SECURE = process.env.COOKIE_SECURE || 'auto';

const parseCookies = (cookieHeader = '') => Object.fromEntries(
  cookieHeader
    .split(';')
    .map(cookie => cookie.trim())
    .filter(Boolean)
    .map(cookie => {
      const separatorIndex = cookie.indexOf('=');
      if (separatorIndex === -1) return [cookie, ''];
      return [
        decodeURIComponent(cookie.slice(0, separatorIndex)),
        decodeURIComponent(cookie.slice(separatorIndex + 1))
      ];
    })
);

const safeCompare = (left = '', right = '') => {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const signSession = (expiresAt) =>
  crypto.createHmac('sha256', SESSION_SECRET).update(String(expiresAt)).digest('hex');

const createSessionCookie = (req) => {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const token = `${expiresAt}.${signSession(expiresAt)}`;
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const secure = COOKIE_SECURE === 'true' || (COOKIE_SECURE === 'auto' && (req.secure || forwardedProto === 'https'));
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    `SameSite=${COOKIE_SAMESITE}`,
    'Path=/',
    COOKIE_DOMAIN ? `Domain=${COOKIE_DOMAIN}` : '',
    `Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}`,
    secure ? 'Secure' : ''
  ].filter(Boolean).join('; ');
};

const createClearSessionCookie = (req) => {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const secure = COOKIE_SECURE === 'true' || (COOKIE_SECURE === 'auto' && (req.secure || forwardedProto === 'https'));
  return [
    `${SESSION_COOKIE}=`,
    'HttpOnly',
    `SameSite=${COOKIE_SAMESITE}`,
    'Path=/',
    COOKIE_DOMAIN ? `Domain=${COOKIE_DOMAIN}` : '',
    'Max-Age=0',
    secure ? 'Secure' : ''
  ].filter(Boolean).join('; ');
};

const isAuthenticated = (req) => {
  if (!APP_PASSWORD || !SESSION_SECRET) return false;

  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (!token) return false;

  const [expiresAt, signature] = token.split('.');
  if (!expiresAt || !signature || Number(expiresAt) < Date.now()) return false;

  return safeCompare(signature, signSession(expiresAt));
};

const requireSession = (req, res, next) => {
  if (isAuthenticated(req)) return next();

  if (!APP_PASSWORD || !SESSION_SECRET) {
    const message = 'APP_PASSWORD et SESSION_SECRET doivent être définis pour activer la connexion.';
    if (req.path.startsWith('/api/')) {
      return res.status(503).json({ error: message });
    }
    return res.status(503).send(message);
  }

  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Connexion requise' });
  }

  return res.redirect('/login');
};

const fachoValidators = [
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
    .escape(),
  body('status')
    .optional()
    .isIn(['a_verifier', 'verifie', 'rejete', 'doublon']).withMessage('Statut invalide'),
  body('categorie')
    .optional()
    .isIn(allowedCategories).withMessage('Catégorie invalide'),
  body('preuve_video')
    .optional({ checkFalsy: true })
    .custom(value => normalizeStoredVideo(value) === value).withMessage('Chemin de vidéo invalide'),
  body('preuve_video_name')
    .optional({ checkFalsy: true })
    .isLength({ max: 140 }).withMessage('Nom de vidéo trop long'),
  body('preuve_video_type')
    .optional({ checkFalsy: true })
    .custom(value => allowedVideoTypes.has(String(value).toLowerCase())).withMessage('Type de vidéo invalide'),
  body('preuves_videos')
    .optional()
    .isArray({ max: 20 }).withMessage('Maximum 20 vidéos par signalement'),
  body('preuves_videos.*.path')
    .optional({ checkFalsy: true })
    .custom(value => normalizeStoredVideo(value) === value).withMessage('Chemin de vidéo invalide'),
  body('preuves_videos.*.name')
    .optional({ checkFalsy: true })
    .isLength({ max: 140 }).withMessage('Nom de vidéo trop long'),
  body('preuves_videos.*.type')
    .optional({ checkFalsy: true })
    .custom(value => allowedVideoTypes.has(String(value).toLowerCase())).withMessage('Type de vidéo invalide')
];

// Middleware de base
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-File-Name', 'x-api-key', 'Authorization'],
  credentials: true
}));

// Middleware de sécurité
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "https:", "'unsafe-inline'"],
      fontSrc: ["'self'", "https:", "data:"],
      imgSrc: ["'self'", "data:", "https:"],
      mediaSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"]
    }
  }
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 1500),
  message: { error: 'Trop de requêtes, réessayez dans quelques minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => (
    req.path === '/health' ||
    req.path === '/sw.js' ||
    req.path === '/manifest.json' ||
    req.path.startsWith('/img/') ||
    req.path.startsWith('/uploads/') ||
    req.path.startsWith('/assets/') ||
    /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?|mp4|webm|mov|m4v)$/i.test(req.path)
  )
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

// Assets publics nécessaires à la page de connexion et à la PWA.
app.use(express.static(path.join(__dirname, 'public'), {
  index: false,
  fallthrough: true
}));

app.get('/login', (req, res) => {
  if (!APP_PASSWORD || !SESSION_SECRET) {
    return res.status(503).send('APP_PASSWORD et SESSION_SECRET doivent être définis dans l’environnement.');
  }

  if (isAuthenticated(req)) {
    return res.redirect('/');
  }

  const loginPage = fs
    .readFileSync(path.join(__dirname, 'public', 'login.html'), 'utf8')
    .replace('<body>', req.query.error ? '<body class="has-error">' : '<body>');

  res.type('html').send(loginPage);
});

app.post('/login', (req, res) => {
  if (!APP_PASSWORD || !SESSION_SECRET) {
    return res.status(503).send('Configuration de connexion manquante.');
  }

  if (!safeCompare(req.body.password || '', APP_PASSWORD)) {
    return res.redirect('/login?error=1');
  }

  res.setHeader('Set-Cookie', createSessionCookie(req));
  return res.redirect('/');
});

app.post('/api/login', (req, res) => {
  if (!APP_PASSWORD || !SESSION_SECRET) {
    return res.status(503).json({ error: 'Configuration de connexion manquante' });
  }

  if (!safeCompare(req.body.password || '', APP_PASSWORD)) {
    return res.status(401).json({ error: 'Mot de passe invalide' });
  }

  res.setHeader('Set-Cookie', createSessionCookie(req));
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', createClearSessionCookie(req));
  res.json({ ok: true });
});

app.get('/api/session', (req, res) => {
  res.json({ authenticated: isAuthenticated(req) });
});

app.use(requireSession);

app.post('/api/proofs/video', (req, res) => {
  const contentType = String(req.headers['content-type'] || '').split(';')[0].toLowerCase();
  if (!allowedVideoTypes.has(contentType)) {
    return res.status(400).json({ error: 'Format vidéo non autorisé. Formats acceptés: MP4, WebM, MOV, M4V.' });
  }

  const extension = videoExtensionsByType[contentType];
  const filename = `${crypto.randomUUID()}.${extension}`;
  const filePath = path.join(UPLOAD_DIR, filename);
  const originalName = cleanVideoName(decodeVideoName(req.headers['x-file-name'])) || `preuve-video.${extension}`;
  const writeStream = fs.createWriteStream(filePath, { flags: 'wx' });
  let uploadedBytes = 0;
  let finished = false;

  const cleanupFile = () => {
    fs.unlink(filePath, () => {});
  };

  const failUpload = (status, message) => {
    if (finished) return;
    finished = true;
    writeStream.destroy();
    cleanupFile();
    res.status(status).json({ error: message });
  };

  req.on('data', (chunk) => {
    uploadedBytes += chunk.length;
    if (uploadedBytes > VIDEO_UPLOAD_MAX_BYTES) {
      req.unpipe(writeStream);
      req.resume();
      failUpload(413, `Vidéo trop lourde. Maximum: ${VIDEO_UPLOAD_MAX_MB} Mo.`);
    }
  });

  req.on('aborted', () => {
    if (!finished) {
      finished = true;
      writeStream.destroy();
      cleanupFile();
    }
  });

  writeStream.on('error', (error) => {
    console.error('Erreur upload vidéo:', error);
    failUpload(500, 'Erreur lors de l’enregistrement de la vidéo.');
  });

  writeStream.on('finish', () => {
    if (finished) return;

    if (uploadedBytes === 0) {
      return failUpload(400, 'Fichier vidéo manquant.');
    }

    finished = true;
    res.status(201).json({
      path: `/uploads/${filename}`,
      name: originalName,
      type: contentType,
      size: uploadedBytes
    });
  });

  req.pipe(writeStream);
});

app.get('/uploads/:filename', (req, res) => {
  const filename = path.basename(req.params.filename || '');
  if (!/^[a-f0-9-]+\.(mp4|webm|mov|m4v)$/i.test(filename)) {
    return res.status(404).send('Introuvable');
  }

  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Introuvable');
  }

  const extension = path.extname(filename).slice(1).toLowerCase();
  const contentType = Object.entries(videoExtensionsByType)
    .find(([, mappedExtension]) => mappedExtension === extension)?.[0] || 'application/octet-stream';
  res.type(contentType);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.sendFile(filePath);
});

const isAllowedAvatarUrl = (value = '') => {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === 'https:' && (
      hostname.includes('tiktokcdn') ||
      hostname.includes('muscdn') ||
      hostname.endsWith('musical.ly') ||
      hostname.endsWith('byteoversea.com')
    );
  } catch (_) {
    return false;
  }
};

app.get('/api/avatar', async (req, res) => {
  const avatarUrl = String(req.query.url || '');
  if (!isAllowedAvatarUrl(avatarUrl)) {
    return res.status(400).json({ error: 'URL avatar invalide' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(avatarUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 Fachopol/1.0'
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Avatar indisponible' });
    }

    const contentType = response.headers.get('content-type') || 'image/webp';
    if (!contentType.startsWith('image/')) {
      return res.status(502).json({ error: 'Réponse avatar invalide' });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(buffer);
  } catch (error) {
    const status = error.name === 'AbortError' ? 504 : 502;
    res.status(status).json({ error: 'Avatar indisponible' });
  } finally {
    clearTimeout(timeout);
  }
});

// Servir l'application uniquement après connexion
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
}

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
app.get('/api/fachos', (req, res) => {
  try {
    console.log('Tentative de récupération des données...')
    const fachos = db.prepare('SELECT * FROM fachos ORDER BY created_at DESC').all().map(serializeFacho);
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
app.post('/api/fachos', fachoValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { pseudo, lien, preuve } = req.body;
  const status = req.body.status || 'a_verifier';
  const categorie = req.body.categorie || 'autre';
  const { videos, videosJson, preuveVideo, preuveVideoName, preuveVideoType } = videoPayloadFromBody(req.body);
  
  if (!pseudo || !lien || !preuve) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  const cleanPseudo = normalizePseudo(pseudo);
  const duplicate = db
    .prepare("SELECT id, pseudo FROM fachos WHERE lower(replace(pseudo, '@', '')) = ?")
    .get(cleanPseudo);

  if (duplicate) {
    return res.status(409).json({
      error: `@${cleanPseudo} est déjà présent dans la base.`,
      duplicate
    });
  }

  let avatar = '';
  let nickname = pseudo;

  try {
    const tikRes = await fetch(`https://www.tikwm.com/api/user/info?unique_id=${cleanPseudo}`);
    const tikData = await tikRes.json();
    if (tikData.code === 0 && tikData.data && tikData.data.user) {
      avatar = tikData.data.user.avatarMedium || '';
      nickname = tikData.data.user.nickname || pseudo;
    }
  } catch (err) {
    console.warn('⚠️ Impossible de récupérer les infos TikTok:', err.message);
  }

  try {
    const insert = db.prepare(`
      INSERT INTO fachos (pseudo, lien, preuve, avatar, nickname, status, categorie, preuve_video, preuve_video_name, preuve_video_type, preuves_videos)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = insert.run(
      pseudo,
      lien,
      preuve,
      avatar,
      nickname,
      status,
      categorie,
      preuveVideo,
      preuveVideoName,
      preuveVideoType,
      videosJson
    );
    
    res.status(201).json({
      id: result.lastInsertRowid,
      pseudo,
      lien,
      preuve,
      avatar,
      nickname,
      status,
      categorie,
      preuves_videos: videos,
      preuve_video: preuveVideo,
      preuve_video_name: preuveVideoName,
      preuve_video_type: preuveVideoType,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout' });
  }
});

// Modifier un signalement existant
app.put('/api/fachos/:id', fachoValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Identifiant invalide' });
  }

  const existing = db.prepare('SELECT * FROM fachos WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Signalement introuvable' });
  }

  const { pseudo, lien, preuve } = req.body;
  const status = req.body.status || 'a_verifier';
  const categorie = req.body.categorie || 'autre';
  const { videosJson, preuveVideo, preuveVideoName, preuveVideoType } = videoPayloadFromBody(req.body, existing);
  const cleanPseudo = normalizePseudo(pseudo);
  const duplicate = db
    .prepare("SELECT id, pseudo FROM fachos WHERE lower(replace(pseudo, '@', '')) = ? AND id != ?")
    .get(cleanPseudo, id);

  if (duplicate) {
    return res.status(409).json({
      error: `@${cleanPseudo} est déjà présent dans la base.`,
      duplicate
    });
  }

  let avatar = existing.avatar || '';
  let nickname = existing.nickname || pseudo;

  if (normalizePseudo(existing.pseudo) !== cleanPseudo) {
    avatar = '';
    nickname = pseudo;
    try {
      const tikRes = await fetch(`https://www.tikwm.com/api/user/info?unique_id=${cleanPseudo}`);
      const tikData = await tikRes.json();
      if (tikData.code === 0 && tikData.data && tikData.data.user) {
        avatar = tikData.data.user.avatarMedium || '';
        nickname = tikData.data.user.nickname || pseudo;
      }
    } catch (err) {
      console.warn('⚠️ Impossible de récupérer les infos TikTok:', err.message);
    }
  }

  try {
    db.prepare(`
      UPDATE fachos
      SET pseudo = ?, lien = ?, preuve = ?, avatar = ?, nickname = ?, status = ?, categorie = ?,
          preuve_video = ?, preuve_video_name = ?, preuve_video_type = ?, preuves_videos = ?
      WHERE id = ?
    `).run(
      pseudo,
      lien,
      preuve,
      avatar,
      nickname,
      status,
      categorie,
      preuveVideo,
      preuveVideoName,
      preuveVideoType,
      videosJson,
      id
    );

    const updated = serializeFacho(db.prepare('SELECT * FROM fachos WHERE id = ?').get(id));
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la modification' });
  }
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: `Vidéo trop lourde. Maximum: ${VIDEO_UPLOAD_MAX_MB} Mo.` });
  }

  console.error('Erreur serveur:', err);
  res.status(500).json({
    error: 'Erreur serveur',
    details: err.message
  });
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
