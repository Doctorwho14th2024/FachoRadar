#!/bin/bash

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔒 Configuration SSL pour l'auto-hébergement${NC}"

# Vérifier si certbot est installé
if ! command -v certbot &> /dev/null; then
    echo "Installation de certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot
fi

# Demander le domaine
read -p "Entrez votre nom de domaine (ex: fachopol.example.com) : " DOMAIN

# Obtenir le certificat Let's Encrypt
echo -e "\n${YELLOW}📜 Obtention du certificat SSL avec Let's Encrypt...${NC}"
sudo certbot certonly --standalone -d $DOMAIN

# Copier les certificats
echo -e "\n${YELLOW}📁 Copie des certificats...${NC}"
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ssl/private.key
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ssl/certificate.crt
sudo cp /etc/letsencrypt/live/$DOMAIN/chain.pem ssl/ca_bundle.crt

# Ajuster les permissions
sudo chown -R $USER:$USER ssl/
chmod 600 ssl/private.key
chmod 644 ssl/certificate.crt ssl/ca_bundle.crt

# Mettre à jour le fichier .env.production
sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN|" .env.production
sed -i "s|FORCE_SSL=.*|FORCE_SSL=true|" .env.production

echo -e "\n${GREEN}✅ Configuration SSL terminée !${NC}"
echo -e "\nPour démarrer le serveur en production :"
echo -e "npm run start:prod"
