#!/usr/bin/env bash
# server-setup.sh — Provisionamento inicial da VPS
# Executar uma única vez como root: bash server-setup.sh <dominio> <email-certbot>
#
# Uso: bash server-setup.sh sami.example.com admin@example.com

set -euo pipefail

DOMAIN="${1:?Forneça o domínio: bash server-setup.sh sami.example.com admin@example.com}"
EMAIL="${2:?Forneça o e-mail para o Certbot}"
APP_DIR="/opt/sami"

echo "==> Instalando dependências do sistema"
apt-get update -qq
apt-get install -y -qq docker.io docker-compose-plugin curl git ufw

echo "==> Habilitando Docker"
systemctl enable --now docker

echo "==> Configurando firewall"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Criando diretório da aplicação"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

echo "==> Copiando arquivos de configuração do repositório"
# Copia nginx e docker-compose do checkout local (executar a partir da raiz do repo)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cp "$REPO_ROOT/docker-compose.yml" "$APP_DIR/"
cp -r "$REPO_ROOT/nginx" "$APP_DIR/"

echo "==> Substituindo domínio na configuração do Nginx"
sed -i "s/\${DOMAIN}/$DOMAIN/g" "$APP_DIR/nginx/conf.d/sami.conf"

echo "==> Criando .env de produção (preencha os valores)"
cat > "$APP_DIR/.env.production" << EOF
# Preencha com os valores reais antes de subir o stack
DATABASE_URL=
GOOGLE_GENERATIVE_AI_API_KEY=
AUTH_SECRET=
NEXTAUTH_URL=https://$DOMAIN
RESEND_API_KEY=
RESEND_FROM_EMAIL=SAMI <noreply@$DOMAIN>
EOF

echo ""
echo "==> PRÓXIMOS PASSOS:"
echo ""
echo "1. Preencha o arquivo $APP_DIR/.env.production com os valores reais"
echo ""
echo "2. Suba apenas o Nginx para obter o certificado SSL:"
echo "   cd $APP_DIR"
echo "   docker compose up -d nginx"
echo ""
echo "3. Emita o certificado SSL:"
echo "   docker compose run --rm certbot certonly \\"
echo "     --webroot -w /var/www/certbot \\"
echo "     --email $EMAIL --agree-tos --no-eff-email \\"
echo "     -d $DOMAIN"
echo ""
echo "4. Suba o stack completo:"
echo "   IMAGE_TAG=latest GITHUB_REPOSITORY=<org>/<repo> \\"
echo "     docker compose --env-file .env.production up -d"
echo ""
echo "5. Configure os GitHub Secrets no repositório:"
echo "   SSH_HOST=89.167.106.38"
echo "   SSH_USER=root"
echo "   SSH_PRIVATE_KEY=<chave privada SSH>"
echo "   DATABASE_URL=<valor do .env>"
echo "   GOOGLE_GENERATIVE_AI_API_KEY=<valor do .env>"
echo "   AUTH_SECRET=<valor do .env>"
echo "   NEXTAUTH_URL=https://$DOMAIN"
echo "   RESEND_API_KEY=<valor do .env>"
echo "   RESEND_FROM_EMAIL=<valor do .env>"
echo ""
echo "Provisionamento concluído."
