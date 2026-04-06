# Deploy — SAMI em VPS com Docker + Nginx Proxy Manager

## Stack

- **VPS**: Hetzner (`89.167.106.38`)
- **App**: Next.js 16 rodando em container Docker (porta 3000)
- **Reverse proxy + SSL**: Nginx Proxy Manager (já instalado em `http://89.167.106.38:81/`)
- **Banco de dados**: Neon PostgreSQL (externo, não roda na VPS)
- **Registry**: GitHub Container Registry (`ghcr.io`)
- **CD**: GitHub Actions → build → push GHCR → deploy SSH

---

## Arquivos de infraestrutura

```
docker-compose.yml          # Apenas o container da app (porta 3000)
scripts/
  server-setup.sh           # Provisionamento inicial da VPS (executar uma vez)
.github/workflows/
  ci.yml                    # CI: lint → typecheck → test → build → docker build
  deploy.yml                # CD: build → push GHCR → deploy SSH
docs/infra/
  deploy.md                 # Este arquivo
```

> Nginx e Certbot **não** estão no docker-compose.yml — o Nginx Proxy Manager
> já instalado na VPS cuida de proxy reverso e SSL.

---

## 1. Domínio

O domínio ainda não foi definido. Quando estiver disponível:

1. Aponte o DNS `A` do domínio para `89.167.106.38`
2. No NPM (`http://89.167.106.38:81/`), crie um **Proxy Host**:
   - **Domain Names**: `<dominio>`
   - **Scheme**: `http`
   - **Forward Hostname/IP**: IP interno da VPS ou nome do container (`172.17.0.1` ou o IP do host Docker)
   - **Forward Port**: `3000`
   - Ative **SSL** → Request a new SSL Certificate (Let's Encrypt)
   - Marque **Force SSL** e **HTTP/2 Support**
3. Atualize o secret `NEXTAUTH_URL` no GitHub para `https://<dominio>`

---

## 2. GitHub Secrets

Configure em **Settings → Secrets and variables → Actions** do repositório:

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

O NPM já está instalado. Só é necessário preparar o diretório da app:

```bash
# Na VPS como root
mkdir -p /opt/sami
cd /opt/sami

# Copiar docker-compose.yml para a VPS
scp docker-compose.yml root@89.167.106.38:/opt/sami/

# Criar .env.production na VPS
cat > /opt/sami/.env.production << 'EOF'
DATABASE_URL=postgresql://...
GOOGLE_GENERATIVE_AI_API_KEY=...
AUTH_SECRET=...
NEXTAUTH_URL=https://<dominio>
RESEND_API_KEY=
RESEND_FROM_EMAIL=SAMI <noreply@dominio>
EOF
```

---

## 4. Primeiro deploy manual

```bash
# 1. Na VPS: autenticar no GHCR
ssh root@89.167.106.38
echo "<GITHUB_PAT>" | docker login ghcr.io -u <github-user> --password-stdin

# 2. Subir o container da app
cd /opt/sami
GITHUB_REPOSITORY=<org>/<repo> IMAGE_TAG=latest \
  docker compose --env-file .env.production up -d

# 3. Verificar que está rodando
docker compose ps
curl http://localhost:3000
```

> Após o container subir, configure o Proxy Host no NPM apontando para a porta 3000.

---

## 5. Pipeline CD automático

Após configurar os GitHub Secrets, **todo push em `main`** dispara:

```
push main
  └─ CI: lint → typecheck → test → build → docker build (smoke test)
       └─ Deploy: build Docker → push ghcr.io → SSH na VPS → docker compose up
```

O deploy substitui apenas o container `app` sem derrubar nada mais na VPS.

---

## 6. Operações no dia a dia

### Ver status
```bash
ssh root@89.167.106.38 "cd /opt/sami && docker compose ps"
```

### Ver logs da app
```bash
ssh root@89.167.106.38 "cd /opt/sami && docker compose logs -f app"
```

### Forçar redeploy manual
```bash
gh workflow run deploy.yml
```

### Acesso ao Nginx Proxy Manager
```
http://89.167.106.38:81/
```

---

## 7. Checklist de ativação

- [ ] Domínio definido e DNS `A` apontando para `89.167.106.38`
- [ ] GitHub Secrets configurados (9 secrets da tabela acima)
- [ ] `/opt/sami/docker-compose.yml` copiado para a VPS
- [ ] `/opt/sami/.env.production` preenchido na VPS
- [ ] Primeiro deploy manual executado com sucesso (`docker compose ps` mostra `app` running)
- [ ] Proxy Host criado no NPM com SSL Let's Encrypt
- [ ] Pipeline CD validado com um push em `main`
