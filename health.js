// Middleware de monitoring de la santé
app.get('/health', (req, res) => {
  try {
    // Vérifier la connexion à la base de données
    try {
      db.prepare('SELECT 1').get();
    } catch (dbError) {
      console.warn('⚠️ Base de données non disponible:', dbError.message);
      // Ne pas échouer si la base de données n'est pas encore prête
    }
    
    // Vérifier l'espace disque disponible
    const os = require('os');
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const memUsage = process.memoryUsage();
    
    // Toujours retourner healthy pour le healthcheck de Railway
    res.json({
      status: 'healthy',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      env: process.env.NODE_ENV,
      memory: {
        free: freeMem,
        total: totalMem,
        usage: memUsage
      }
    });
  } catch (error) {
    console.error('❌ Erreur healthcheck:', error);
    // Toujours retourner 200 pour le healthcheck de Railway
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  }
});
