# 🎯 Fachopol

<div align="center">
  <img src="public/img/favicon.svg" alt="FachoRadar Logo" width="120" height="120" />
</div>


[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/fr/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

FachoRadar est une application web moderne conçue pour surveiller et suivre le contenu extrémiste de droite  sur les plateformes de médias sociaux. Elle offre des fonctionnalités avancées de suivi en temps réel et d'analyse de données.

## ✨ Fonctionnalités

- 🔍 Recherche et suivi des comptes
- 📊 Analyse en temps réel
- 💾 Stockage local avec SQLite
- 🎨 Interface utilisateur moderne avec TailwindCSS

## 🚀 Installation


# Cloner le repository
git clone https://github.com/Doctorwho14th2024/FachoRadar

# Installer les dépendances
cd FachoPOL
npm install

# Initialiser la base de données
npm run init-db
\`\`\`

## 🛠️ Démarrage

1. Démarrer le serveur de développement :
\`\`\`
npm run start
\`\`\`

2. L'application sera accessible sur :
   - Interface utilisateur : [http://localhost:5173](http://localhost:5173)
   - API Backend : [http://localhost:3000](http://localhost:3000)

## 🧰 Stack Technique

- **Frontend**: Vite, TailwindCSS
- **Backend**: Express.js
- **Base de données**: SQLite, Supabase
- **Outils**: Sharp (traitement d'images)

## 📝 Scripts disponibles

- \`npm run dev\`: Lance le serveur de développement Vite
- \`npm run build\`: Compile le projet pour la production
- \`npm run preview\`: Prévisualise la version de production
- \`npm run server\`: Démarre le serveur Express
- \`npm run start\`: Lance le serveur et le client en parallèle
- \`npm run init-db\`: Initialise la base de données

## 🚀 Déploiement

### Prérequis
- Node.js 18+ installé
- Pour l'auto-hébergement : Un serveur Linux avec accès root
- Pour Railway.app : Un compte Railway

### Option 1 : Déploiement sur Railway.app

1. Installer le CLI Railway :
```bash
npm i -g @railway/cli
```

2. Se connecter à Railway :
```bash
railway login
```

3. Initialiser le déploiement :
```bash
npm run deploy:init
```

4. Déployer sur Railway :
```bash
npm run deploy:railway
```

### Option 2 : Auto-hébergement avec SSL

1. Préparation du serveur :
```bash
# Installer les dépendances nécessaires
sudo apt-get update
sudo apt-get install -y nodejs npm certbot
```

2. Cloner et configurer le projet :
```bash
git clone https://github.com/votre-nom/FachTOK.git
cd FachTOK
npm install
npm run deploy:init
```

3. Configurer SSL avec Let's Encrypt :
```bash
npm run deploy:setup-ssl
```

4. Démarrer le serveur :
```bash
npm run start:prod
```

### Variables d'environnement

- `PORT` : Port HTTP (défaut: 3000)
- `HTTPS_PORT` : Port HTTPS (défaut: 443)
- `FORCE_SSL` : Forcer HTTPS (true/false)
- `CORS_ORIGIN` : Origine autorisée pour CORS
- `JWT_SECRET` : Clé secrète pour JWT
- `API_KEY` : Clé API
- `DB_PATH` : Chemin de la base de données
>>>>>>> 87edc69 (Configuration initiale pour Railway)

## 📄 Licence

Ce projet est sous licence MIT.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou soumettre une pull request.


