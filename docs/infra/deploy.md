# Deploy — SAMI em VPS com Docker + Nginx Proxy Manager

## Stack

- **VPS**: Hetzner (`89.167.106.38`)
- **Domínio**: `sami.blackboxinovacao.com.br`
- **App**: Next.js 16 rodando em container Docker (porta 3000)
- **Reverse proxy + SSL**: Nginx Proxy Manager (instalado em `http://89.167.106.38:81/`)
- **Banco de dados**: Neon PostgreSQL (externo, não roda na VPS)
- **Registry**: GitHub Container Registry (`ghcr.io`)
- **CD**: GitHub Actions → build → push GHCR → SCP → deploy SSH

---

## Arquivos de infraestrutura

```
docker-compose.yml          # Apenas o container da app (porta 3000)
scripts/
  server-setup.sh           # Provisionamento inicial da VPS (executar uma vez)
.github/workflows/
  ci.yml                    # CI: lint → typecheck → test → build → docker build
  deploy.yml                # CD: build → push GHCR → scp compose → deploy SSH
docs/infra/
  deploy.md                 # Este arquivo
```

> Nginx e Certbot **não** estão no docker-compose.yml — o Nginx Proxy Manager
> já instalado na VPS cuida de proxy reverso e SSL.

---

## Notas de ambiente

- A VPS usa **docker-compose v1** (comando `docker-compose` com hífen). O plugin
  `docker compose` v2 não está instalado.
- O diretório `/opt/sami` é criado automaticamente pelo pipeline no primeiro deploy.
- O `docker-compose.yml` é sincronizado para a VPS via SCP a cada deploy.

---

## 1. Domínio

**Domínio:** `sami.blackboxinovacao.com.br`

Passos para ativar HTTPS:

1. Aponte o DNS `A` de `sami.blackboxinovacao.com.br` para `89.167.106.38`
2. No NPM (`http://89.167.106.38:81/`), crie um **Proxy Host**:
   - **Domain Names**: `sami.blackboxinovacao.com.br`
   - **Scheme**: `http`
   - **Forward Hostname/IP**: `172.17.0.1` (IP do host Docker na VPS)
   - **Forward Port**: `3000`
   - Ative **SSL** → Request a new SSL Certificate (Let's Encrypt)
   - Marque **Force SSL** e **HTTP/2 Support**
3. Atualize o secret `NEXTAUTH_URL` no GitHub para `https://sami.blackboxinovacao.com.br`

---

## 2. GitHub Secrets

Configure em **Settings → Secrets and variables → Actions** do repositório:

| Secret | Descrição | Status |
|--------|-----------|--------|
| `SSH_HOST` | IP da VPS (`89.167.106.38`) | ✅ configurado |
| `SSH_USER` | Usuário SSH (`root`) | ✅ configurado |
| `SSH_PRIVATE_KEY` | Chave privada SSH — `~/.ssh/hetzner` | ✅ configurado |
| `DATABASE_URL` | Connection string Neon | ✅ configurado |
| `GOOGLE_GENERATIVE_AI_API_KEY` | API key Google AI | ✅ configurado |
| `AUTH_SECRET` | Secret do NextAuth | ✅ configurado |
| `NEXTAUTH_URL` | `https://sami.blackboxinovacao.com.br` | ⏳ atualizar após DNS propagado |
| `RESEND_API_KEY` | API key Resend (e-mail) | ⏳ pendente |
| `RESEND_FROM_EMAIL` | Remetente de e-mails | ⏳ pendente |

> Os valores de `DATABASE_URL`, `GOOGLE_GENERATIVE_AI_API_KEY` e `AUTH_SECRET`
> estão no arquivo `.env` local do projeto.

---

## 3. Como o pipeline funciona

Todo push em `main` dispara dois workflows em paralelo:

```
push main
  ├─ CI (ci.yml)
  │    lint → typecheck → test → build Next.js → docker build (smoke test)
  │
  └─ Deploy (deploy.yml)  ← só executa após CI passar
       build Docker image
       push → ghcr.io/ftenorioinkluziva/medv0:sha-<hash> + :latest
       scp docker-compose.yml → /opt/sami/
       SSH na VPS:
         mkdir -p /opt/sami
         docker login ghcr.io
         escreve .env.production com os secrets
         docker-compose pull app
         docker-compose up -d --no-deps app
         docker image prune -f
       verifica: docker-compose ps + curl localhost:3000
```

O deploy substitui **apenas o container `app`** — o NPM e demais serviços da VPS
não são afetados.

---

## 4. Primeiro deploy automático (já executado ✅)

O pipeline foi validado com sucesso em 2026-04-06. O container está rodando na VPS.

Para verificar:
```bash
ssh root@89.167.106.38 "cd /opt/sami && docker-compose ps"
```

---

## 5. Operações no dia a dia

### Ver status dos containers
```bash
ssh root@89.167.106.38 "cd /opt/sami && docker-compose ps"
```

### Ver logs da app em tempo real
```bash
ssh root@89.167.106.38 "cd /opt/sami && docker-compose logs -f app"
```

### Forçar redeploy manual (sem commit)
```bash
gh workflow run deploy.yml
```

### Reiniciar o container manualmente
```bash
ssh root@89.167.106.38 "cd /opt/sami && docker-compose restart app"
```

### Acesso ao Nginx Proxy Manager
```
http://89.167.106.38:81/
```

---

## 6. Checklist de ativação

- [x] GitHub Secrets configurados (9 secrets)
- [x] Pipeline CI verde (lint, typecheck, 202 testes, build, docker build)
- [x] Pipeline Deploy verde (build → push GHCR → deploy SSH)
- [x] Container rodando na VPS (`/opt/sami`)
- [ ] DNS `A` de `sami.blackboxinovacao.com.br` apontando para `89.167.106.38`
- [ ] Proxy Host criado no NPM (`sami.blackboxinovacao.com.br` → `172.17.0.1:3000`) com SSL Let's Encrypt
- [ ] Secret `NEXTAUTH_URL` atualizado para `https://sami.blackboxinovacao.com.br`
- [ ] `RESEND_API_KEY` e `RESEND_FROM_EMAIL` configurados (e-mail transacional)
