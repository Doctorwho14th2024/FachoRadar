# Configuration SSL pour la Production

Pour activer HTTPS en production, suivez ces étapes :

1. **Générer des certificats SSL autosignés pour le développement** :
```bash
# Générer une clé privée
openssl genrsa -out ssl/private.key 2048

# Générer un certificat
openssl req -new -x509 -key ssl/private.key -out ssl/certificate.crt -days 365 \
-subj "/C=FR/ST=IDF/L=Paris/O=FachoRadar/CN=localhost"
```

2. **Pour la production**, vous devrez :
- Obtenir un certificat SSL valide (par exemple via Let's Encrypt)
- Placer les fichiers suivants dans le dossier `ssl/` :
  - `private.key` : Votre clé privée
  - `certificate.crt` : Votre certificat
  - `ca_bundle.crt` : Le certificat de l'autorité (si nécessaire)

3. **Configuration pour la production** :
```bash
# Copier le fichier d'environnement de production
cp .env.example .env.production

# Éditer les variables d'environnement
nano .env.production

# Définir les permissions appropriées pour les certificats SSL
chmod 600 ssl/private.key
chmod 644 ssl/certificate.crt
chmod 644 ssl/ca_bundle.crt
```

4. **Variables d'environnement importantes** :
```env
NODE_ENV=production
PORT=80
HTTPS_PORT=443
CORS_ORIGIN=https://votre-domaine.com
```

5. **Démarrer le serveur en production** :
```bash
NODE_ENV=production npm start
```

Le serveur démarrera automatiquement en mode HTTPS si :
- `NODE_ENV` est défini sur `production`
- Les certificats SSL sont présents dans le dossier `ssl/`

En production, tout le trafic HTTP sera automatiquement redirigé vers HTTPS.
