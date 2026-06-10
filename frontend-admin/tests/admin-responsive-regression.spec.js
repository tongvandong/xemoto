import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const routes = [
  ['Tổng quan', '/'],
  ['Xe máy', '/motorcycles'],
  ['Phụ tùng', '/parts'],
  ['Danh mục', '/categories'],
  ['Hãng xe và dòng xe', '/brands'],
  ['Đơn hàng', '/orders'],
  ['Voucher', '/vouchers'],
  ['Tồn kho', '/inventory'],
  ['Phiếu kho', '/stock-documents'],
  ['Vận hành nâng cao', '/advanced-operations'],
  ['Vận hành cửa hàng', '/business-operations'],
  ['Import dữ liệu', '/operational-imports'],
  ['Người dùng', '/users'],
  ['Khách hàng', '/customers'],
  ['Bảo hành', '/warranties'],
  ['Đánh giá', '/reviews'],
  ['Banner trang chủ', '/home-banners'],
  ['Bài viết', '/posts'],
  ['FAQ', '/faq'],
  ['Liên hệ', '/contacts'],
  ['Báo cáo', '/reports'],
  ['Nhật ký hệ thống', '/audit-logs'],
  ['Cấu hình vận hành', '/settings'],
];

const viewports = [
  ['desktop', { width: 1440, height: 1000 }],
  ['tablet', { width: 1024, height: 768 }],
  ['mobile', { width: 390, height: 844 }],
];

async function login(page, request) {
  const response = await request.post('/api/auth/login', {
    data: { email: 'admin@motosale.local', password: 'Admin@123' },
  });
  expect(response.ok()).toBeTruthy();

  const data = await response.json();
  await page.addInitScript(({ token, user }) => {
    window.localStorage.setItem('admin_token', token);
    window.localStorage.setItem('admin_user', JSON.stringify(user));
  }, { token: data.token, user: data.user });
}

test.describe('Admin responsive route regression', () => {
  for (const [viewportName, viewport] of viewports) {
    test(`${viewportName}: routes render without overflow or mojibake`, async ({ page, request }) => {
      await page.setViewportSize(viewport);
      await login(page, request);

      for (const [name, route] of routes) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(180);

        const state = await page.evaluate(() => ({
          body: document.body.innerText,
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));

        expect.soft(state.body, `${name} không được lỗi tải dữ liệu`).not.toContain('Không thể tải');
        expect.soft(state.body, `${name} không được lỗi mã hóa UTF-8`).not.toMatch(/Ã|áº|Ä‘|Æ°|â€“|�/);
        expect.soft(state.scrollWidth, `${name} không được tràn ngang`).toBeLessThanOrEqual(state.clientWidth + 3);
      }
    });
  }

  test('import page changes workflow tabs and captures key screens', async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await login(page, request);

    const screenshotDir = path.resolve('../../test-artifacts/screenshots');
    await mkdir(screenshotDir, { recursive: true });

    await page.goto('/operational-imports');
    await expect(page.getByRole('heading', { name: 'Import dữ liệu vận hành' })).toBeVisible();
    await page.getByRole('button', { name: 'Tồn đầu kỳ', exact: true }).click();
    await expect(page.getByText('Cột XLSX: Mã kho, Mã SKU, Tồn đầu kỳ.')).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, 'operational-imports-stock.png'), fullPage: true });

    await page.getByRole('button', { name: 'Sản phẩm và SKU', exact: true }).click();
    await expect(page.getByText(/Cột XLSX: Mã sản phẩm, Tên sản phẩm/)).toBeVisible();

    await page.goto('/business-operations');
    await expect(page.getByRole('heading', { name: 'Vận hành cửa hàng' })).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, 'business-operations.png'), fullPage: true });

    await page.goto('/advanced-operations');
    await expect(page.getByRole('heading', { name: 'Vận hành nâng cao' })).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, 'advanced-operations.png'), fullPage: true });
  });
});
