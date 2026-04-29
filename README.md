<div align="center">
  <img src="public/img/logo.png" alt="Fachopol Logo" width="200" style="border-radius: 20px; box-shadow: 0 0 20px rgba(220, 38, 38, 0.4);" />
  
  <br/><br/>
  
  <h1>Fachopol - La Vigie Antifasciste</h1>
  
  <h3>Base de données collaborative et sécurisée</h3>
  
  <p><em>Identifier • Documenter • Combattre</em></p>

  <br/>

  <!-- Stack -->
  [![Vite](https://img.shields.io/badge/VITE-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![TailwindCSS](https://img.shields.io/badge/TAILWIND-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
  [![Express](https://img.shields.io/badge/EXPRESS-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
  [![SQLite](https://img.shields.io/badge/SQLITE-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org)
  [![Node.js](https://img.shields.io/badge/NODE.JS-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)

  <!-- Qualite -->
  [![Version](https://img.shields.io/badge/version-1.0.0-dc2626?style=for-the-badge)](https://github.com/Doctorwho14th2024/Fachopol)
  [![Licence MIT](https://img.shields.io/badge/licence-MIT-22c55e?style=for-the-badge)](LICENSE)
  [![Docker](https://img.shields.io/badge/DOCKER-ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](docker-compose.yml)
  [![PWA](https://img.shields.io/badge/PWA-installable-7c3aed?style=for-the-badge&logo=pwa&logoColor=white)](#)
  [![Mise a jour](https://img.shields.io/badge/mise_a_jour-avril_2026-f59e0b?style=for-the-badge)](#)
</div>

<br/>

## Mission

> **Fachopol** est un outil militant développé pour la communauté antifasciste. Il permet d'identifier, documenter et combattre la présence de l'extrême-droite sur les réseaux sociaux. 

L'application offre une interface moderne, sécurisée et rapide pour le signalement de comptes problématiques sur TikTok.

> **Note importante** : Fachopol est actuellement conçu uniquement pour TikTok. Les liens acceptés doivent pointer vers `tiktok.com` ; les autres plateformes ne sont pas prises en charge.

## Fonctionnalités Principales

| Tracking Intelligent | Interface Moderne | Sécurité Renforcée |
|-------------------------|----------------------|-----------------------|
| • Signalement rapide<br>• Comptes TikTok uniquement<br>• Lien et preuves intégrées<br>• Recherche instantanée | • UI Glassmorphism<br>• Animations fluides<br>• Dark Mode optimisé | • Protection XSS active<br>• Requêtes préparées (Anti-SQLi)<br>• Anti-Spam (Rate Limit) |

## Stack Technique

### Frontend
- **Framework** : Vite.js + Vanilla JS
- **Styling** : TailwindCSS v3 (Glassmorphism & animations personnalisées)
- **Typographie** : Outfit & Inter (Google Fonts)

### Backend
- **Serveur** : Express.js
- **Base de données** : SQLite3 (`better-sqlite3` avec mode WAL)
- **Sécurité** : `helmet`, `express-rate-limit`, `express-validator`

## Démarrage Rapide

```bash
# 1. Cloner le projet
git clone https://github.com/Doctorwho14th2024/Fachopol.git

# 2. Installation
cd Fachopol && npm install

# 3. Démarrer l'application (Client + Serveur)
npm run start
```

L'application sera accessible sur :
- Interface Web : [http://localhost:5173](http://localhost:5173)
- API : [http://localhost:3000/api](http://localhost:3000/api)

## Commandes principales

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance le client Vite en mode dev |
| `npm run server` | Lance le serveur Express en mode dev |
| `npm run start` | Lance **les deux** simultanément |
| `npm run build` | Construit l'application pour la production |
| `npm run start:prod` | Démarre l'application complète en production |
| `npm run deploy:railway` | Déploie sur Railway.app |

## Deploiement (Production)

<details open>
<summary>Docker / Docker Compose (Recommande)</summary>

Installation automatique avec un script indépendant :

```bash
curl -fsSL https://raw.githubusercontent.com/Doctorwho14th2024/FachoRadar/main/install-fachoradar.sh | bash
```

Avec domaine et port :

```bash
curl -fsSL https://raw.githubusercontent.com/Doctorwho14th2024/FachoRadar/main/install-fachoradar.sh | DOMAIN=fachoradar.example.com PORT=3000 bash
```

Ou en téléchargement manuel :

```bash
curl -fsSLO https://raw.githubusercontent.com/Doctorwho14th2024/FachoRadar/main/install-fachoradar.sh
chmod +x install-fachoradar.sh
./install-fachoradar.sh
```

Le script crée un dossier de déploiement autonome avec `.env`, `docker-compose.yml`, secrets générés, configuration Pangolin/reverse proxy et image `liberchat/fachoradar:latest`.
Il demande interactivement le dossier, le port, le domaine, l'URL publique, le domaine cookie et le mot de passe. Si `.env` existe déjà, il met à jour ces valeurs sans supprimer les autres réglages.

Copier le fichier d'environnement :

```bash
cp .env.example .env
# Editer .env avec vos valeurs
```

Lancer avec Docker Compose :

```bash
# Build et demarrage en arriere-plan
docker compose up -d --build

# Voir les logs en direct
docker compose logs -f

# Arreter le service
docker compose down

# Arreter ET supprimer les donnees (attention : irreversible)
docker compose down -v
```

La base de donnees SQLite est persistee dans le volume Docker `fachopol_data` — elle survit aux redemarrages du conteneur.

Pour HTTPS automatique via Let's Encrypt, decommenter la section `traefik` dans `docker-compose.yml` et definir `DOMAIN=votredomaine.fr` dans votre `.env`.

Pour un reverse proxy externe comme Pangolin, exposez le conteneur sur `3000` et configurez le proxy vers une cible stable :

- Pangolin/Hawser tourne dans un conteneur séparé : utilisez `http://IP_DU_SERVEUR:3000`.
- Pangolin et Fachopol sont dans le même réseau Docker Compose : utilisez `http://fachopol:3000`.
- Évitez `http://127.0.0.1:3000` depuis un conteneur Pangolin : cela pointe vers Pangolin lui-même, pas vers l'hôte.
- Évitez les IP Docker `172.x.x.x` comme `172.18.0.2` : elles peuvent changer après recréation du conteneur et provoquer `no available server`.

Gardez `TRUST_PROXY=1` pour que l'app comprenne les headers `X-Forwarded-Proto` et génère correctement les cookies derrière HTTPS.

Si Pangolin affiche `no available server`, testez depuis le serveur :

```bash
curl -I http://127.0.0.1:3000/health
docker compose ps
docker compose logs --tail=80 fachopol
```

Si `/health` répond en local mais Pangolin affiche encore `no available server`, corrigez la cible upstream dans Pangolin vers `http://IP_DU_SERVEUR:3000` ou mettez Pangolin et Fachopol sur le même réseau Docker.

Méthode la plus fiable avec Hawser en conteneur :

```bash
docker network ls
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
docker network connect fachoradar-deploy_default hawser
```

Adaptez `fachoradar-deploy_default` si votre réseau Compose a un autre nom, et adaptez `hawser` si le conteneur Hawser porte un autre nom. Ensuite, dans Pangolin, utilisez cette cible :

```text
http://fachopol:3000
```

Vous pouvez tester depuis Hawser :

```bash
docker exec hawser wget -qO- http://fachopol:3000/health
```

Si la connexion revient immédiatement sur `/login`, vérifiez la configuration cookie dans `.env` :

```env
TRUST_PROXY=1
PUBLIC_URL=https://votre-domaine.example
COOKIE_SECURE=auto
COOKIE_SAMESITE=Lax
COOKIE_DOMAIN=
```

Laissez `COOKIE_DOMAIN` vide pour un seul domaine. Utilisez uniquement une valeur de type `.example.com` si vous voulez partager la session entre plusieurs sous-domaines. Ne mettez jamais `https://`, un port, ni le sous-domaine complet dans `COOKIE_DOMAIN`.

</details>

<details>
<summary>Sur Railway.app</summary>

```bash
npm i -g @railway/cli
railway login
npm run deploy:railway
```

</details>

<details>
<summary>Auto-hebergement (bare metal)</summary>

```bash
sudo apt update && sudo apt install -y nodejs npm certbot
npm run deploy:setup-ssl
npm run start:prod
```

</details>

## Configuration (Variables d'Environnement)

Renommez le fichier `.env.example` en `.env` :

| Variable | Description | Défaut |
|----------|-------------|---------|
| `PORT` | Port HTTP du serveur | 3000 |
| `HTTPS_PORT` | Port HTTPS | 443 |
| `DB_PATH` | Chemin de la base SQLite | `./data/database.db` |
| `CORS_ORIGIN` | Origine CORS autorisée | `*` |
| `APP_PASSWORD` | Mot de passe de connexion à l'app | requis |
| `SESSION_SECRET` | Secret long pour signer les cookies | requis |
| `TRUST_PROXY` | Active la confiance envers le reverse proxy (`1` derrière Pangolin/Traefik/Nginx) | `1` en production |
| `PUBLIC_URL` | URL publique derrière le proxy | vide |
| `COOKIE_SECURE` | `auto`, `true` ou `false` pour l'attribut Secure | `auto` |
| `COOKIE_SAMESITE` | Politique SameSite du cookie | `Lax` |
| `COOKIE_DOMAIN` | Domaine cookie partagé, ex. `.example.com` pour multi-sous-domaines | vide |

## Sécurité

- **Protection XSS** : `express-validator` côté serveur et `escapeHTML()` côté client.
- **Protection SQLi** : Requêtes préparées strictes.
- **Rate limiting** : Protection DDoS et Anti-Spam activée.
- **Headers HTTP** : Sécurisés via `helmet`.
- **Anonymat** : Aucune adresse IP ou donnée personnelle n'est stockée dans la base de données de signalement.

## Contribution

La lutte antifasciste est collective ! Vos contributions sont les bienvenues.

1. Fork le projet
2. Crée une branche (`git checkout -b feature/NouvelleIdee`)
3. Commit tes changements (`git commit -m 'Ajout: Nouvelle idée'`)
4. Push vers la branche (`git push origin feature/NouvelleIdee`)
5. Ouvre une Pull Request

## Licence

Distribué sous licence MIT. Voir [`LICENSE`](LICENSE) pour plus d'informations.

---

<div align="center">

### La lutte antifasciste ne s'arrête jamais

<sub>Version 1.0.0 | © 2026</sub>

</div>
