# Script pour configurer SSL en développement
openssl genrsa -out private.key 2048
openssl req -new -x509 -key private.key -out certificate.crt -days 365 \
-subj "/C=FR/ST=IDF/L=Paris/O=FachoRadar/CN=localhost"

echo "✅ Certificats SSL générés avec succès"

# Définir les bonnes permissions
chmod 600 private.key
chmod 644 certificate.crt

echo "✅ Permissions des certificats configurées"
