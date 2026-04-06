# Deploy — SAMI em VPS com Docker + Nginx + SSL

## Stack

- **VPS**: Hetzner (`89.167.106.38`)
- **App**: Next.js 16 rodando em container Docker
- **Reverse proxy**: Nginx (alpine) com SSL terminado na borda
- **SSL**: Let's Encrypt via Certbot (renovação automática)
- **Banco de dados**: Neon PostgreSQL (externo, não roda na VPS)
- **Registry**: GitHub Container Registry (`ghcr.io`)
- **CD**: GitHub Actions → build → push GHCR → deploy SSH

---

## Arquivos de infraestrutura

```
docker-compose.yml          # Stack completo (app + nginx + certbot)
nginx/
  nginx.conf                # Config base Nginx
  conf.d/
    sami.conf               # VHost: HTTP→HTTPS + proxy + cache de assets
scripts/
  server-setup.sh           # Provisionamento inicial da VPS (executar uma vez)
.github/workflows/
  ci.yml                    # CI: lint → typecheck → test → build → docker build
  deploy.yml                # CD: build → push GHCR → deploy SSH
```

---

## 1. Domínio

O domínio ainda não foi definido. Quando estiver disponível:

1. Aponte o DNS `A` do domínio para `89.167.106.38`
2. Substitua `${DOMAIN}` em `nginx/conf.d/sami.conf` pelo domínio real
3. Atualize o secret `NEXTAUTH_URL` no GitHub para `https://<dominio>`

---

## 2. GitHub Secrets

Configure estes secrets em **Settings → Secrets and variables → Actions** do repositório:

| Secret | Descrição | Exemplo |
|--------|-----------|---------|
| `SSH_HOST` | IP da VPS | `89.167.106.38` |
| `SSH_USER` | Usuário SSH | `root` |
| `SSH_PRIVATE_KEY` | Chave privada SSH (Ed25519) | `-----BEGIN OPENSSH...` |
| `DATABASE_URL` | Connection string Neon | `postgresql://...` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | API key Google AI | `AIza...` |
| `AUTH_SECRET` | Secret do NextAuth | `ovi/jAJ...` |
| `NEXTAUTH_URL` | URL pública da app | `https://<dominio>` |
| `RESEND_API_KEY` | API key Resend (e-mail) | `re_...` |
| `RESEND_FROM_EMAIL` | Remetente de e-mails | `SAMI <noreply@dominio>` |

> Os valores de `DATABASE_URL`, `GOOGLE_GENERATIVE_AI_API_KEY` e `AUTH_SECRET`
> estão no arquivo `.env` local do projeto.

---

## 3. Provisionamento inicial da VPS (uma vez)

Executar a partir da raiz do repositório, conectado à VPS ou localmente com acesso SSH:

```bash
# Na VPS como root
bash scripts/server-setup.sh <dominio> <email-certbot>

# Exemplo
bash scripts/server-setup.sh sami.example.com admin@example.com
```

O script:
- Instala Docker, docker-compose-plugin, ufw
- Abre portas 80, 443 e SSH no firewall
- Cria `/opt/sami/` com os arquivos de configuração
- Gera `.env.production` para preencher
- Exibe as próximas etapas

---

## 4. Primeiro deploy manual (após provisionamento)

```bash
# 1. Preencher variáveis de ambiente na VPS
nano /opt/sami/.env.production

# 2. Subir apenas o Nginx (para obter o certificado SSL)
cd /opt/sami
docker compose up -d nginx

# 3. Emitir certificado SSL
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email <email> --agree-tos --no-eff-email \
  -d <dominio>

# 4. Reiniciar Nginx com SSL ativo
docker compose restart nginx

# 5. Subir o stack completo
GITHUB_REPOSITORY=<org>/<repo> IMAGE_TAG=latest \
  docker compose --env-file .env.production up -d
```

---

## 5. Pipeline CD automático

Após configurar os GitHub Secrets, **todo push em `main`** dispara o pipeline:

```
push main
  └─ CI: lint → typecheck → test → build → docker build (smoke test)
       └─ Deploy: build Docker → push ghcr.io → SSH na VPS → docker compose up
```

O CD só executa se o CI passar. O deploy é zero-downtime: só o container `app` é
substituído; Nginx permanece em pé durante a atualização.

---

## 6. Operações no dia a dia

### Ver status dos containers
```bash
ssh root@89.167.106.38 "cd /opt/sami && docker compose ps"
```

### Ver logs da app
```bash
ssh root@89.167.106.38 "cd /opt/sami && docker compose logs -f app"
```

### Ver logs do Nginx
```bash
ssh root@89.167.106.38 "cd /opt/sami && docker compose logs -f nginx"
```

### Forçar redeploy manual
```bash
# Dispara o workflow de deploy manualmente pelo GitHub CLI
gh workflow run deploy.yml
```

### Renovação SSL (automática via Certbot)
O container `certbot` tenta renovar a cada 12 horas. Para forçar manualmente:
```bash
ssh root@89.167.106.38 "cd /opt/sami && docker compose run --rm certbot renew"
```

---

## 7. Variáveis de ambiente de produção

Arquivo em `/opt/sami/.env.production` na VPS (nunca commitado no repositório):

```env
DATABASE_URL=postgresql://...
GOOGLE_GENERATIVE_AI_API_KEY=...
AUTH_SECRET=...
NEXTAUTH_URL=https://<dominio>
RESEND_API_KEY=
RESEND_FROM_EMAIL=SAMI <noreply@dominio>
```

---

## 8. Checklist de ativação

- [ ] Domínio definido e DNS apontando para `89.167.106.38`
- [ ] `${DOMAIN}` substituído em `nginx/conf.d/sami.conf`
- [ ] GitHub Secrets configurados (9 secrets da tabela acima)
- [ ] Provisionamento inicial executado (`scripts/server-setup.sh`)
- [ ] `.env.production` preenchido na VPS
- [ ] Certificado SSL emitido via Certbot
- [ ] Primeiro deploy manual executado com sucesso
- [ ] Pipeline CD validado com um push em `main`
