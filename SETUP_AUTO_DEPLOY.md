# Huong dan cau hinh Auto-Deploy (GitHub Actions self-hosted runner)

Tai lieu nay ghi lai cach cau hinh auto-deploy cho he thong XeMoto/MoToSale:
moi khi `git push origin main` len repo deploy, VPS **tu dong** `build` va `up -d` lai cac container.

## Mo hinh & nguyen tac
- 1 repo deploy: `https://github.com/tongvandong/xemoto` (branch `main`), goc repo = noi dung `v2`.
- VPS clone tai `/opt/xemoto`.
- Co che: cai **self-hosted runner** cua GitHub Actions ngay tren VPS. Push len `main`
  -> GitHub giao job cho runner -> runner chay lenh redeploy ngay tai cho.
- Uu diem: khong can mo SSH, khong luu SSH key trong GitHub, build ngay noi deploy.
- Service Docker: `mssql, auth, api, gateway, admin, store`. Cong noi bo: admin 8080, store 8081, gateway 5100.

> Yeu cau truoc: da chuyen ve 1 repo (day thang `v2` len `xemoto`) — xem `REDEPLOY_AFTER_CODE_CHANGE.md` muc 0.

## 0. Luu y bao mat repo public
GitHub canh bao: self-hosted runner tren repo **public** co rui ro (fork tao Pull Request co the chay code la tren runner).
- **Khuyen nghi: doi `xemoto` sang Private** (Settings > General > Danger Zone > Change visibility > Private).
- Neu giu public: workflow trong tai lieu nay **chi trigger `push` vao `main`** (khong chay `pull_request`),
  nen fork/PR cua nguoi la KHONG kich hoat duoc runner. Day la rao chan chinh, nhung Private van an toan hon.

## 1. Chuan bi VPS
Chay bang **root**. Tao user thuong chay runner (khong chay runner bang root):

```bash
adduser deploy                      # dat password tuy y
usermod -aG docker deploy           # de goi duoc docker compose
chown -R deploy:deploy /opt/xemoto  # de runner git pull / build trong thu muc deploy
```

Kiem tra user deploy goi duoc docker:

```bash
su - deploy -c 'docker ps'          # khong loi permission la dat
```

## 2. Dang ky runner (tren GitHub + VPS)
Tren GitHub: repo `xemoto` > **Settings > Actions > Runners > New self-hosted runner** > chon **Linux / X64**.
GitHub hien san block lenh kem **token dang ky** (token chi song ~1 gio; het han thi bam lai nut de lay token moi).

Tren VPS, chay bang user `deploy` (KHONG phai root — runner tu choi chay duoi root):

```bash
su - deploy
mkdir actions-runner && cd actions-runner
# Dung dung URL/version/hash GitHub dua cho ban (vi du v2.334.0):
curl -o actions-runner-linux-x64-2.334.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.334.0/actions-runner-linux-x64-2.334.0.tar.gz
echo "<HASH_GITHUB_DUA>  actions-runner-linux-x64-2.334.0.tar.gz" | shasum -a 256 -c
tar xzf ./actions-runner-linux-x64-2.334.0.tar.gz
./config.sh --url https://github.com/tongvandong/xemoto --token <TOKEN_GITHUB_DUA>
```

Khi `config.sh` hoi -> Enter het (runner group Default, name mac dinh, labels mac dinh `self-hosted,Linux,X64`, work folder `_work`).

(Tuy chon) test ket noi trong foreground:

```bash
./run.sh        # thay "Connected to GitHub" + "Listening for Jobs" -> Ctrl+C de dung
```

## 3. Cai runner chay nen (service)
**Cai bang root**, chi dinh service chay duoi user `deploy`.
> Luu y: KHONG can cap sudo cho `deploy`. Neu chay `sudo ./svc.sh install` bang user deploy se loi
> `deploy is not in the sudoers file`. Cach dung la cai bang root nhu duoi.

```bash
exit                                 # tu shell deploy quay ve root
cd /home/deploy/actions-runner
./svc.sh install deploy              # tao systemd service User=deploy
./svc.sh start
./svc.sh status                      # phai "active (running)"
```

Neu vua them user vao nhom docker o buoc 1, restart runner de nhan quyen moi:

```bash
cd /home/deploy/actions-runner && ./svc.sh stop && ./svc.sh start
```

Kiem tra: GitHub > repo `xemoto` > Settings > Actions > Runners -> runner hien **Idle** (cham xanh).

## 4. Them workflow vao repo
File da co san trong repo: `.github/workflows/deploy.yml` (goc repo = thu muc `v2` o local):

```yaml
name: deploy

on:
  push:
    branches: [main]
  workflow_dispatch:            # cho phep bam "Run workflow" thu cong

concurrency:
  group: deploy
  cancel-in-progress: false     # khong cat ngang khi dang build

jobs:
  deploy:
    runs-on: self-hosted
    steps:
      - name: Redeploy on VPS
        run: |
          set -e
          cd /opt/xemoto
          git fetch origin
          git reset --hard origin/main      # khop dung commit vua push
          docker compose build
          docker compose up -d
          docker compose ps
```

Diem co y:
- Chi trigger `push` vao `main` (khong `pull_request`).
- `git reset --hard origin/main` thay cho `git pull` -> tranh ket neu cay lam viec tren VPS lech.
- KHONG dung `docker compose down -v` (se xoa volume DB + anh upload).

Day file len (lan dau):

```powershell
cd D:\MotorTeam\MoToSale-End\v2
git add .github/workflows/deploy.yml
git commit -m "ci: auto-deploy qua self-hosted runner"
git push origin main
```

## 5. Chay thu & kiem tra
Chinh cu push them file workflow nay se kich hoat run "deploy" dau tien.
- GitHub > repo `xemoto` > tab **Actions** > click run "deploy" > mo step "Redeploy on VPS" xem log realtime.
- Trong luc chay, trang Runners doi tu **Idle** -> **Active** (Active = dang chay job, BINH THUONG). Xong lai ve Idle.
- Job xanh ✅ la xong. Doi chieu tren VPS: `cd /opt/xemoto && docker compose ps` (cac container vua duoc up lai).
- Test that: sua 1 thu nho o FE -> `git push origin main` -> xem Actions tu build + up.

## 6. Quy trinh hang ngay sau khi co auto-deploy
Chi can o local:

```powershell
cd D:\MotorTeam\MoToSale-End\v2
git add .
git commit -m "fix: ..."
git push origin main
```

Khong can SSH vao VPS nua — runner tu lo phan con lai. (Van co the SSH vao xem log neu can.)

## 7. Quan ly runner (cac lenh hay dung)
Tren VPS (root), trong `/home/deploy/actions-runner`:

```bash
./svc.sh status      # xem trang thai
./svc.sh stop        # dung
./svc.sh start       # chay
./svc.sh uninstall   # go service
# Go han runner khoi GitHub (lay token "remove" o trang Runners):
su - deploy -c 'cd ~/actions-runner && ./config.sh remove --token <TOKEN>'
```

Tat tam auto-deploy: GitHub > Settings > Actions (disable), hoac doi ten/xoa file `.github/workflows/deploy.yml`.

## 8. Xu ly loi thuong gap
- **`deploy is not in the sudoers file`**: dung cai service bang user deploy. Cai bang root: `./svc.sh install deploy` (muc 3).
- **Runner Offline / job bi treo (queued)**: runner chua chay. Tren VPS: `cd /home/deploy/actions-runner && ./svc.sh status` roi `./svc.sh start`. Job se chay tiep khi runner online.
- **Runner "Active" mai khong xong**: dang build that (lan dau build image lau vai phut). Xem log o tab Actions.
- **`permission denied` khi goi docker trong job**: user deploy chua o nhom docker, hoac chua restart runner sau khi them nhom. Chay `usermod -aG docker deploy` roi `./svc.sh stop && ./svc.sh start`.
- **Token het han khi config**: token dang ky chi song ~1 gio; bam lai "New self-hosted runner" de lay token moi.
- **Job loi o `docker compose build`**: SSH vao VPS chay tay `cd /opt/xemoto && docker compose build` de xem loi chi tiet.
- **Web van hien code cu**: hard refresh `Ctrl+F5`; hoac build no-cache: `docker compose build --no-cache admin store && docker compose up -d admin store`.
- **api 500 sau deploy / migration loi**: `docker compose logs --tail=200 api`. Migration loi co the lam `api` khong len; backup DB truoc thay doi schema lon.
- **TUYET DOI khong** `docker compose down -v` khi redeploy (xoa volume `mssql-data` = DB, `api-uploads` = anh).
