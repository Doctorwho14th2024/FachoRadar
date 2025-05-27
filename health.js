// Middleware de monitoring de la santé
app.get('/health', (req, res) => {
  try {
    // Vérifier la connexion à la base de données
    db.prepare('SELECT 1').get();
    
    // Vérifier l'espace disque disponible
    const os = require('os');
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const memUsage = process.memoryUsage();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        free: freeMem,
        total: totalMem,
        usage: memUsage
      },
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
