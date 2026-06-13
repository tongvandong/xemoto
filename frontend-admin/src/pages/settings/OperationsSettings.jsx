import React, { useEffect, useState } from 'react';
import operationsService from '../../services/operationsService';
import { useAuth } from '../../contexts/AuthContext';

const DEFAULT_SETTINGS = [
  ['StoreName', 'Tên cửa hàng'],
  ['ContactName', 'Người liên hệ hiển thị ở storefront'],
  ['Hotline', 'Hotline'],
  ['ZaloPhone', 'Số Zalo hiển thị ở storefront'],
  ['StoreEmail', 'Email hiển thị ở storefront'],
  ['Address', 'Địa chỉ'],
  ['StoreDistrict', 'Quận/Huyện hiển thị ở storefront'],
  ['StoreProvince', 'Tỉnh/Thành phố hiển thị ở storefront'],
  ['StoreHours', 'Giờ mở cửa hiển thị ở storefront'],
  ['FacebookUrl', 'Link Facebook'],
  ['MessengerUrl', 'Link Messenger'],
  ['YoutubeUrl', 'Link YouTube'],
  ['DefaultLowStockThreshold', 'Ngưỡng tồn thấp mặc định'],
  ['DepositPolicy', 'Chính sách đặt cọc'],
  ['CancelPolicy', 'Chính sách hủy đơn'],
  ['WarrantyPolicy', 'Chính sách bảo hành'],
  ['DefaultShippingFee', 'Phí vận chuyển mặc định'],
  ['TaxCode', 'Mã số thuế cửa hàng (hóa đơn VAT)'],
  ['VatRate', 'Thuế suất VAT mặc định (%) - để trống = 10'],
  // Thanh toán chuyển khoản (hiển thị QR cho khách ở storefront)
  ['BankName', 'Ngân hàng nhận chuyển khoản (vd: Vietcombank)'],
  ['BankCode', 'Mã ngân hàng VietQR (vd: VCB, TCB, BIDV, MB)'],
  ['BankAccountNo', 'Số tài khoản nhận chuyển khoản'],
  ['BankAccountName', 'Tên chủ tài khoản'],
  ['BankQrUrl', 'Link ảnh QR cố định (tùy chọn — nếu có thì dùng thay QR tự sinh)'],
];

const getApiMessage = (err, fallback) => err?.response?.data?.message || fallback;

const OperationsSettings = () => {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canEdit = isAdmin();

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const settingsRes = await operationsService.getSettings();
      const fromApi = settingsRes.data.items || [];
      const map = new Map(fromApi.map((item) => [item.key ?? item.Key, item]));
      setSettings(DEFAULT_SETTINGS.map(([key, label]) => ({
        key,
        label,
        value: map.get(key)?.value ?? map.get(key)?.Value ?? '',
        moTa: map.get(key)?.moTa ?? map.get(key)?.MoTa ?? label,
      })));
    } catch (err) {
      setError(getApiMessage(err, 'Không thể tải cấu hình vận hành.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await operationsService.saveSettings(settings.map((item) => ({ key: item.key, value: item.value, moTa: item.moTa })));
      await fetchData();
    } catch (err) {
      alert(getApiMessage(err, 'Không thể lưu cấu hình hệ thống.'));
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (index, value) => {
    setSettings((prev) => prev.map((item, i) => (i === index ? { ...item, value } : item)));
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <h1 className="m-0">Cấu hình vận hành</h1>
        </div>
      </div>
      <section className="content">
        <div className="container-fluid">
          {error && <div className="alert alert-danger">{error}</div>}
          {!canEdit && <div className="alert alert-info">Staff chỉ được xem cấu hình, chỉ Admin được chỉnh sửa.</div>}

          <div className="card">
            <div className="card-header"><h3 className="card-title">Cấu hình cửa hàng</h3></div>
            <div className="card-body">
              {loading ? (
                <div className="text-center text-muted py-4">Đang tải cấu hình...</div>
              ) : (
                <>
                  <div className="alert alert-info">
                    Hệ thống đang vận hành theo mô hình một cửa hàng kiêm kho duy nhất. Phần quản lý nhiều kho/showroom đã được gỡ khỏi cấu hình.
                  </div>
                  <div className="row">
                    {settings.map((item, index) => (
                      <div className="col-md-6" key={item.key}>
                        <div className="form-group">
                          <label>{item.label}</label>
                          <textarea className="form-control" rows="2" value={item.value || ''} disabled={!canEdit} onChange={(e) => updateSetting(index, e.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {canEdit && <button className="btn btn-primary" onClick={saveSettings} disabled={saving}>Lưu cấu hình</button>}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default OperationsSettings;
