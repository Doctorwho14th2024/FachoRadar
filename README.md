# 🎯 Fachopol

<div align="center">
  <img src="public/img/favicon.svg" alt="Fachopol Logo" width="120" height="120" />
</div>

[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/fr/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

Fachopol est une application web permettant de constituer une liste de comptes fascistes (fachos) présents sur les réseaux sociaux. L'objectif est d'identifier ces comptes, de savoir qui ils sont et de permettre l'organisation d'actions antifascistes (antifa) coordonnées contre eux.

## ✨ Fonctionnalités

- 📝 Constitution collaborative d'une liste de comptes fachos
- 🔗 Centralisation des liens de profils
- 📢 Outils pour organiser des actions antifa sur les réseaux
- 💾 Stockage local avec SQLite
- 🔄 Synchronisation possible avec Supabase
- 🎨 Interface utilisateur moderne avec TailwindCSS

## 🚀 Installation

```bash
# Cloner le repository
git clone https://github.com/votre-username/Fachopol.git

# Installer les dépendances
cd Fachopol
npm install

# Initialiser la base de données
npm run init-db
```

## 🛠️ Démarrage

1. Démarrer le serveur de développement :
```bash
npm run start
```

2. L'application sera accessible sur :
   - Interface utilisateur : [http://localhost:5173](http://localhost:5173)
   - API Backend : [http://localhost:3000](http://localhost:3000)

## 🧰 Stack Technique

- **Frontend**: Vite, TailwindCSS
- **Backend**: Express.js
- **Base de données**: SQLite, Supabase
- **Outils**: Sharp (traitement d'images)

## 📝 Scripts disponibles

- `npm run dev`: Lance le serveur de développement Vite
- `npm run build`: Compile le projet pour la production
- `npm run preview`: Prévisualise la version de production
- `npm run server`: Démarre le serveur Express
- `npm run start`: Lance le serveur et le client en parallèle
- `npm run init-db`: Initialise la base de données

## 📄 Licence

Ce projet est sous licence MIT.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou soumettre une pull request.
