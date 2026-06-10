# Huong dan deploy MoToSale/XeMoto len VPS Ubuntu + nginx

Tai lieu nay ghi lai quy trinh deploy he thong XeMoto/MoToSale len VPS Ubuntu 24.04, dung Docker Compose cho app va nginx + Certbot de tro domain/HTTPS.

Thong tin demo hien tai:

- VPS IP: `160.187.229.220`
- Domain khach hang: `https://xemoto.xyz`
- Domain admin: `https://admin.xemoto.xyz`
- Repo deploy: `https://github.com/tongvandong/xemoto`
- OS khuyen nghi: Ubuntu 24.04 x86_64

Luu y bao mat:

- Khong ghi mat khau VPS, mat khau SQL, JWT secret that vao file nay.
- File `.env` tren VPS chua secret that va khong duoc commit.
- Sau khi deploy xong nen doi mat khau root neu da tung chia se mat khau.

## 1. Tro DNS domain ve VPS

Trong trang quan ly DNS cua domain `xemoto.xyz`, tao cac ban ghi:

| Type | Name/Host | Value | TTL |
|---|---|---|---|
| A | `@` | `160.187.229.220` | `300` hoac `Auto` |
| A | `admin` | `160.187.229.220` | `300` hoac `Auto` |

Kiem tra DNS tren may local:

```powershell
Resolve-DnsName xemoto.xyz -Server 1.1.1.1
Resolve-DnsName admin.xemoto.xyz -Server 1.1.1.1
```

Neu dung Linux/macOS:

```bash
dig xemoto.xyz @1.1.1.1
dig admin.xemoto.xyz @1.1.1.1
```

Ket qua dung la ca hai domain deu tro ve IP VPS.

## 2. SSH vao VPS

Tu may local:

```bash
ssh root@160.187.229.220
```

Neu dung SSH key:

```bash
ssh -i /duong/dan/toi/key root@160.187.229.220
```

Kiem tra OS:

```bash
lsb_release -a
uname -a
```

## 3. Cai goi can thiet

Chay tren VPS:

```bash
apt update
apt install -y ca-certificates curl git docker.io docker-compose-v2 nginx certbot python3-certbot-nginx ufw openssl
systemctl enable --now docker
```

Neu VPS dang co Caddy chay san va chiem port 80, tat Caddy:

```bash
systemctl stop caddy
systemctl disable caddy
```

Bat nginx:

```bash
systemctl enable --now nginx
```

Kiem tra:

```bash
docker --version
docker compose version
nginx -v
certbot --version
```

Neu nginx khong start duoc, kiem tra port:

```bash
ss -ltnp | grep ':80\|:443'
systemctl status nginx --no-pager
nginx -t
```

## 4. Clone source deploy

Clone repo moi, trong do noi dung `v2` da nam o root repo:

```bash
cd /opt
git clone https://github.com/tongvandong/xemoto.git
cd /opt/xemoto
```

Neu thu muc da ton tai:

```bash
cd /opt/xemoto
git pull
```

## 5. Tao file moi truong `.env`

Tao `.env` tu file mau:

```bash
cp .env.example .env
```

Sinh mat khau SQL va JWT secret ngau nhien:

```bash
SA_PASSWORD="MoToSale@$(openssl rand -hex 12)A1!"
JWT_SECRET="$(openssl rand -hex 48)"
sed -i "s|^MSSQL_SA_PASSWORD=.*|MSSQL_SA_PASSWORD=${SA_PASSWORD}|" .env
sed -i "s|^JWT_SECRET_KEY=.*|JWT_SECRET_KEY=${JWT_SECRET}|" .env
```

Kiem tra file:

```bash
cat .env
```

Khong commit file `.env`.

## 6. Build va chay he thong bang Docker Compose

Trong thu muc `/opt/xemoto`:

```bash
docker compose build
docker compose up -d
docker compose ps
```

Lan dau co the mat vai phut vi phai tai image SQL Server, .NET, Node va build frontend.

Cac service chinh:

- `mssql`: SQL Server
- `auth`: AuthService
- `api`: APIService
- `gateway`: ApiGateway/Ocelot
- `admin`: frontend admin nginx
- `store`: frontend store nginx

Test tam bang IP:

```text
Admin: http://160.187.229.220:8080
Store: http://160.187.229.220:8081
API:   http://160.187.229.220:5100/health/api
```

Kiem tra log neu co loi:

```bash
docker compose logs --tail=100 api
docker compose logs --tail=100 gateway
docker compose logs --tail=100 admin
docker compose logs --tail=100 store
```

## 7. Cau hinh nginx reverse proxy

Tao file site:

```bash
nano /etc/nginx/sites-available/xemoto.xyz
```

Dien noi dung:

```nginx
server {
    listen 80;
    server_name xemoto.xyz;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name admin.xemoto.xyz;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Bat site va reload nginx:

```bash
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/xemoto.xyz /etc/nginx/sites-enabled/xemoto.xyz
nginx -t
systemctl reload nginx
```

## 8. Cap HTTPS bang Certbot

Dam bao DNS da tro dung truoc khi chay:

```bash
certbot --nginx -d xemoto.xyz -d admin.xemoto.xyz
```

Khi Certbot hoi:

- Email: nhap email that de nhan thong bao renew loi/het han.
- Terms of Service: nhap `Y`.
- Share email voi EFF: tuy chon `Y` hoac `N`.

Neu thanh cong, se thay:

```text
Successfully received certificate.
Successfully deployed certificate for xemoto.xyz
Successfully deployed certificate for admin.xemoto.xyz
Congratulations! You have successfully enabled HTTPS
```

Kiem tra:

```bash
nginx -t
systemctl status nginx --no-pager
certbot certificates
curl -I https://xemoto.xyz
curl -I https://admin.xemoto.xyz
```

## 9. Cau hinh firewall

Mo SSH va web:

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

Trong luc test co the tam mo port app:

```bash
ufw allow 8080
ufw allow 8081
ufw allow 5100
```

Sau khi HTTPS qua nginx da chay on, dong cac port app noi bo:

```bash
ufw delete allow 8080
ufw delete allow 8081
ufw delete allow 5100
ufw status
```

Chi nen de public:

- `22`: SSH
- `80`: HTTP
- `443`: HTTPS

## 10. Test sau deploy

Mo trinh duyet:

```text
https://xemoto.xyz
https://admin.xemoto.xyz
```

Kiem tra API:

```bash
curl -I https://xemoto.xyz
curl -I https://admin.xemoto.xyz
curl http://127.0.0.1:5100/health/api
curl http://127.0.0.1:5100/health/auth
```

Kiem tra container:

```bash
cd /opt/xemoto
docker compose ps
```

Tat ca container nen o trang thai `Up`.

Neu trinh duyet bao `DNS_PROBE_FINISHED_NXDOMAIN`, kiem tra:

```bash
Resolve-DnsName xemoto.xyz -Server 1.1.1.1
Resolve-DnsName admin.xemoto.xyz -Server 1.1.1.1
```

Tren Windows co the flush DNS:

```powershell
ipconfig /flushdns
```

Chrome:

```text
chrome://net-internals/#dns
```

Sau do bam `Clear host cache`.

## 11. Deploy lai khi sua code

Quy trinh 1 repo: sua code trong `v2` roi push thang len `xemoto` (xem chi tiet trong `REDEPLOY_AFTER_CODE_CHANGE.md`).

Tren may local (thu muc `D:\MotorTeam\MoToSale-End\v2`):

```bash
git add .
git commit -m "fix: update demo"
git push origin main
```

Tren VPS (bo qua neu da bat auto-deploy):

```bash
cd /opt/xemoto
git pull
docker compose build
docker compose up -d
docker compose ps
```

Kiem tra log neu can:

```bash
docker compose logs --tail=100 api
docker compose logs --tail=100 gateway
docker compose logs --tail=100 admin
docker compose logs --tail=100 store
```

Khong dung lenh nay neu khong muon xoa DB va anh upload:

```bash
docker compose down -v
```

Lenh `-v` se xoa volumes, bao gom SQL Server data va upload images.

## 12. Lenh van hanh nhanh

Xem trang thai:

```bash
cd /opt/xemoto
docker compose ps
```

Restart toan bo:

```bash
docker compose restart
```

Restart tung service:

```bash
docker compose restart api
docker compose restart gateway
docker compose restart admin
docker compose restart store
```

Xem log realtime:

```bash
docker compose logs -f api
```

Kiem tra nginx:

```bash
nginx -t
systemctl status nginx --no-pager
```

Reload nginx:

```bash
systemctl reload nginx
```

Gia han SSL thu cong neu can:

```bash
certbot renew --dry-run
```

## 13. Ghi chu bao mat sau khi deploy

Nen lam:

- Doi mat khau root neu da tung chia se.
- Dung SSH key thay cho password.
- Khong public SQL Server port `1433`.
- Khong public port `8080`, `8081`, `5100` sau khi nginx/HTTPS da on.
- Backup DB dinh ky neu dung lau dai.

Thoat SSH khong lam tat web:

```bash
exit
```

Web van chay vi nginx va Docker containers chay nen bang system service.
