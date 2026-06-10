# Huong dan deploy lai sau khi sua code (1 repo)

Tai lieu nay dung cho quy trinh **1 repo** hien tai:

- Source lam viec chinh = goc repo deploy luon: `D:\MotorTeam\MoToSale-End\v2`
- Repo deploy (chua noi dung `v2` o root): `https://github.com/tongvandong/xemoto` (branch `main`)
- VPS clone source tai: `/opt/xemoto`
- Domain store: `https://xemoto.xyz`
- Domain admin: `https://admin.xemoto.xyz`

> Truoc day dung 2 repo (repo goc `MoToSale-End` + subtree split sang `xemoto`). Da chuyen sang **day thang `v2` len `xemoto`**, khong con buoc subtree split. Repo cu `MoToSale-End` chi giu lai de luu tru (archive), khong dung de deploy.

## Nguyen tac quan trong
- Khong sua truc tiep file trong container Docker.
- Khong commit file `.env` (da co `.gitignore` chan; chi commit `.env.example`).
- Khong chay `docker compose down -v` neu khong muon xoa DB va anh upload.
- Nen build truoc, sau do moi `up -d` de neu build loi thi app cu van con chay.

## 0. (Chi lam 1 lan) Chuyen tu 2 repo sang 1 repo
Neu thu muc `v2` chua phai la repo rieng (chua co `v2\.git`):

```powershell
cd D:\MotorTeam\MoToSale-End\v2
# Da co san .gitignore (chan node_modules/bin/obj/.env)
git init -b main
git remote add origin https://github.com/tongvandong/xemoto.git
git add .
git status          # KIEM TRA: KHONG duoc thay node_modules/ bin/ obj/ .env
git commit -m "chore: v2 thanh repo deploy doc lap"
git push -u --force origin main
```

Dong bo lai VPS mot lan (vi history bi thay moi):

```bash
cd /opt/xemoto
git fetch origin
git reset --hard origin/main
docker compose build && docker compose up -d && docker compose ps
```

Tu sau buoc nay, lam theo muc 1-3 ben duoi.

## 1. Sua code tren may local
Sua code trong `D:\MotorTeam\MoToSale-End\v2` (vi du `backend`, `frontend-admin`, `frontend-store`, `docker-compose.yml`).

Test nhanh truoc khi push (tuy chon):

```powershell
cd D:\MotorTeam\MoToSale-End\v2\frontend-admin ; npm run build
cd D:\MotorTeam\MoToSale-End\v2\frontend-store ; npm run build
cd D:\MotorTeam\MoToSale-End\v2\backend ; dotnet test
```

## 2. Commit va push thang len `xemoto`

```powershell
cd D:\MotorTeam\MoToSale-End\v2
git add .
git status
git commit -m "fix: update demo"
git push origin main
```

(Khong con buoc `git subtree split` nua.)

## 3. Pull + build + chay tren VPS

```bash
cd /opt/xemoto
git pull --ff-only
docker compose build
docker compose up -d
docker compose ps
```

Tat ca service nen `Up`: `mssql, auth, api, gateway, admin, store`.

> Neu da bat auto-deploy (GitHub Actions self-hosted runner / SSH), buoc 3 chay tu dong sau khi push o buoc 2.

## 4. Kiem tra log sau deploy

```bash
docker compose logs --tail=100 api
docker compose logs --tail=100 auth
docker compose logs --tail=100 gateway
docker compose logs --tail=100 admin
docker compose logs --tail=100 store
```

Realtime: `docker compose logs -f api`

## 5. Kiem tra web

```bash
curl -I https://xemoto.xyz
curl -I https://admin.xemoto.xyz
curl http://127.0.0.1:5100/health/api
curl http://127.0.0.1:5100/health/auth
```

Trinh duyet: `https://xemoto.xyz` , `https://admin.xemoto.xyz`

## 6. Chi sua frontend (nhanh hon)

```bash
cd /opt/xemoto
git pull --ff-only
docker compose build admin store
docker compose up -d admin store
```

## 7. Chi sua backend

```bash
cd /opt/xemoto
git pull --ff-only
docker compose build api          # hoac auth / gateway tuy service sua
docker compose up -d api
```

Lenh chung van an toan neu khong chac sua service nao:

```bash
docker compose build && docker compose up -d
```

## 8. Neu co migration DB
APIService tu chay EF migration khi start. Sau khi pull code moi:

```bash
docker compose build api
docker compose up -d api
docker compose logs --tail=150 api
```

Luu y: migration loi co the lam `api` khong len. Nen backup DB truoc migration lon. Khong xoa volume DB.

## 9. Lenh KHONG nen dung

```bash
docker compose down -v   # -v xoa volume: mssql-data (DB) + api-uploads (anh)
```

Chi muon restart: `docker compose restart`
Chi muon recreate sau build: `docker compose up -d`

## 10. Xu ly loi thuong gap

### Web van hien code cu

```bash
cd /opt/xemoto
git log -1 --oneline
docker compose build --no-cache admin store
docker compose up -d admin store
```

Hard refresh browser: `Ctrl + F5`

### API loi 500

```bash
docker compose logs --tail=200 api
```

### Gateway khong goi duoc API

```bash
docker compose ps
docker compose logs --tail=100 gateway
curl http://127.0.0.1:5100/health/api
```

### git pull bao loi sau khi push lai

Neu lo force-push tao history moi tren `xemoto`, dong bo lai VPS:

```bash
cd /opt/xemoto
git fetch origin
git reset --hard origin/main
docker compose build && docker compose up -d
```

## 11. Quy trinh nhanh de nho

Local:

```powershell
cd D:\MotorTeam\MoToSale-End\v2
git add .
git commit -m "fix: update demo"
git push origin main
```

VPS (bo qua neu da co auto-deploy):

```bash
cd /opt/xemoto
git pull --ff-only
docker compose build
docker compose up -d
docker compose ps
```
