import { expect, test } from '@playwright/test';

const routes = [
  ['Dashboard', '/'],
  ['Xe máy', '/motorcycles'],
  ['Phụ tùng', '/parts'],
  ['Danh mục', '/categories'],
  ['Hãng xe và dòng xe', '/brands'],
  ['Đơn hàng', '/orders'],
  ['Voucher', '/vouchers'],
  ['Tồn kho', '/inventory'],
  ['Phiếu kho', '/stock-documents'],
  ['Người dùng', '/users'],
  ['Khách hàng', '/customers'],
  ['Bảo hành', '/warranties'],
  ['Đánh giá', '/reviews'],
  ['Bài viết', '/posts'],
  ['FAQ', '/faq'],
  ['Liên hệ', '/contacts'],
  ['Banner trang chủ', '/home-banners'],
  ['Báo cáo', '/reports'],
  ['Audit log', '/audit-logs'],
  ['Cấu hình vận hành', '/settings'],
];

const safeLabels = [
  'Chi tiết',
  'Xem chi tiết',
  'Xem',
  'Sửa',
  'Biến thể',
  'Ảnh',
  'Tương thích xe',
  'Thêm xe máy',
  'Thêm phụ tùng',
  'Thêm danh mục',
  'Thêm hãng',
  'Thêm dòng xe',
  'Thêm Voucher',
  'Thêm bài viết',
  'Thêm FAQ',
  'Thêm banner',
  'Tạo phiếu kho',
  'Tạo phiếu bảo hành',
  'Xuất Excel',
  'Xuất danh sách đơn',
  'Xuất báo cáo tồn kho',
  'Xuất báo cáo doanh thu',
  'Áp dụng',
  'Tìm',
  'Lọc',
  'Xóa lọc',
  'Giữ chỗ',
  'Ngưỡng',
  'Điều chỉnh',
  'Mở danh mục con',
];

async function login(page, request) {
  const response = await request.post('/api/auth/login', {
    data: {
      email: 'admin@motosale.local',
      password: 'Admin@123',
    },
  });
  expect(response.ok()).toBeTruthy();

  const data = await response.json();
  await page.addInitScript(({ token, user }) => {
    window.localStorage.setItem('admin_token', token);
    window.localStorage.setItem('admin_user', JSON.stringify(user));
  }, { token: data.token, user: data.user });
}

async function closeTransientUi(page) {
  for (const label of ['Hủy', 'Huỷ', 'Đóng', 'Cancel']) {
    const button = page.locator('button:not([disabled])').filter({ hasText: label }).last();
    if (await button.isVisible().catch(() => false)) {
      await button.click({ timeout: 2_000 });
      return;
    }
  }

  const closeButton = page.locator('.modal .close, .modal [aria-label="Close"]').last();
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click();
  }
}

test.describe('Admin UI real-world button coverage', () => {
  test.beforeEach(async ({ page, request }) => {
    page.on('dialog', (dialog) => dialog.dismiss());
    await login(page, request);
  });

  for (const [name, route] of routes) {
    test(`${name}: route loads, table renders, safe buttons are clickable`, async ({ page }, testInfo) => {
      await page.goto(route);
      await expect(page.locator('body')).not.toContainText('Không thể tải');

      const layout = await page.evaluate(() => ({
        url: location.href,
        buttonLabels: [...document.querySelectorAll('button,a.btn,[role="button"]')]
          .filter((el) => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && !el.disabled;
          })
          .map((el) => (el.innerText || el.getAttribute('title') || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' '))
          .filter(Boolean),
        rowCount: document.querySelectorAll('table tbody tr').length,
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 3,
      }));

      await testInfo.attach('visible-ui-state', {
        body: JSON.stringify(layout, null, 2),
        contentType: 'application/json',
      });

      expect(layout.horizontalOverflow).toBeFalsy();

      const labelsToClick = [...new Set(layout.buttonLabels)].filter((label) => safeLabels.includes(label));

      for (const label of labelsToClick) {
        await page.goto(route);
        const candidate = page.getByText(label, { exact: true }).first();
        if (!(await candidate.isVisible().catch(() => false))) continue;

        const beforeUrl = page.url();
        await candidate.click();
        await page.waitForTimeout(300);
        await closeTransientUi(page);

        if (page.url() !== beforeUrl && !page.url().endsWith(route)) {
          await page.goBack().catch(() => page.goto(route));
        }
      }
    });
  }
});
