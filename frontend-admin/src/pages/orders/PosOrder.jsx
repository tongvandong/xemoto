import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import inventoryService from '../../services/inventoryService';
import orderService from '../../services/orderService';
import operationsService from '../../services/operationsService';
import businessOperationsService from '../../services/businessOperationsService';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatMoneyInput, normalizeMoneyInput } from '../../utils/moneyInput';
import { printVatInvoice } from '../../utils/vatInvoice';

const toText = (value) => String(value ?? '').trim();
const normalizeSearch = (value) => toText(value).toLowerCase();

const getSkuId = (sku) => sku.id ?? sku.skuId ?? sku.productSkuId ?? sku.maBienThe ?? sku.maSkuId;
const getSkuCode = (sku) => toText(sku.skuCode ?? sku.code ?? sku.maSku);
const getBarcode = (sku) => toText(sku.barcode ?? sku.barCode ?? sku.maVach);
const getProductName = (sku) => toText(sku.productName ?? sku.tenSanPham ?? sku.name);
const getVariantName = (sku) => toText(sku.variantName ?? sku.tenBienThe ?? sku.skuName);
const getCartKey = (sku) => toText(getSkuId(sku) ?? getSkuCode(sku) ?? getBarcode(sku));
const getLineKey = (line) => toText(line.cartKey ?? line.skuId);

const getSkuPrice = (sku) => {
  const value = sku.salePrice ?? sku.giaBan ?? sku.listPrice ?? sku.giaNiemYet ?? 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const getAvailableQty = (sku) => {
  const value = sku.availableQty
    ?? sku.available
    ?? sku.stockAvailable
    ?? sku.tonKhoKhaDung
    ?? sku.onHand
    ?? sku.stock
    ?? sku.tonKho;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const isSkuSellable = (sku) => {
  const availableQty = getAvailableQty(sku);
  return availableQty === null || availableQty > 0;
};

const PosOrder = () => {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const [skus, setSkus] = useState([]);
  const [skuFilter, setSkuFilter] = useState('');
  const [lines, setLines] = useState([]);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [note, setNote] = useState('');
  const [orderType, setOrderType] = useState('FullPayment');
  const [depositAmount, setDepositAmount] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paidAmount, setPaidAmount] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState({});
  const [created, setCreated] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    businessOperationsService.getLookups()
      .then((res) => setCustomers(res.data?.customers || []))
      .catch(() => {});
  }, []);

  const matchedCustomers = useMemo(() => {
    const kw = normalizeSearch(customerSearch);
    if (!kw) return [];
    return customers.filter((c) => `${c.fullName || ''} ${c.phoneNumber || ''} ${c.email || ''}`.toLowerCase().includes(kw)).slice(0, 8);
  }, [customers, customerSearch]);

  const selectCustomer = (c) => {
    setSelectedCustomer(c);
    setCustomerName(c.fullName || '');
    setCustomerPhone(c.phoneNumber || '');
    setCustomerSearch('');
  };
  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerName('');
    setCustomerPhone('');
  };

  useEffect(() => {
    operationsService.getSettings()
      .then((res) => {
        const list = res.data?.items || res.data || [];
        const map = {};
        list.forEach((s) => { if (s?.key) map[s.key] = s.value; });
        setSettings(map);
      })
      .catch(() => {});
  }, []);

  const resetForm = () => {
    setLines([]);
    setSkuFilter('');
    setSelectedCustomer(null);
    setCustomerSearch('');
    setCustomerName('');
    setCustomerPhone('');
    setNote('');
    setOrderType('FullPayment');
    setDepositAmount('');
    setVoucherCode('');
    setPaidAmount('');
  };

  useEffect(() => {
    inventoryService.getSkus()
      .then((res) => {
        const data = res.data;
        setSkus(Array.isArray(data) ? data : data.items || data.data || []);
      })
      .catch(() => setSkus([]));
  }, []);

  const filteredSkus = useMemo(() => {
    const keyword = normalizeSearch(skuFilter);
    if (!keyword) return [];

    return skus
      .filter((sku) => {
        const searchable = [
          getSkuCode(sku),
          getBarcode(sku),
          getProductName(sku),
          getVariantName(sku),
        ].join(' ');

        return normalizeSearch(searchable).includes(keyword);
      })
      .sort((a, b) => {
        const aExact = [getSkuCode(a), getBarcode(a)].some((value) => normalizeSearch(value) === keyword);
        const bExact = [getSkuCode(b), getBarcode(b)].some((value) => normalizeSearch(value) === keyword);
        if (aExact !== bExact) return aExact ? -1 : 1;
        return getProductName(a).localeCompare(getProductName(b), 'vi');
      })
      .slice(0, 12);
  }, [skus, skuFilter]);

  const addSkuToLines = (sku) => {
    if (!sku || !isSkuSellable(sku)) return;

    const skuId = getSkuId(sku);
    const cartKey = getCartKey(sku);
    if (!cartKey || skuId === undefined || skuId === null || skuId === '') {
      setError('SKU không có mã định danh, không thể thêm vào đơn.');
      return;
    }

    setError('');
    setLines((prev) => {
      const existing = prev.find((line) => getLineKey(line) === cartKey);
      if (existing) {
        return prev.map((line) => (
          getLineKey(line) === cartKey ? { ...line, qty: Number(line.qty || 0) + 1 } : line
        ));
      }

      return [...prev, {
        cartKey,
        skuId,
        skuCode: getSkuCode(sku),
        barcode: getBarcode(sku),
        productName: getProductName(sku),
        variantName: getVariantName(sku),
        availableQty: getAvailableQty(sku),
        unitPrice: getSkuPrice(sku),
        qty: 1,
      }];
    });

    setSkuFilter('');
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    const firstSellableSku = filteredSkus.find(isSkuSellable);
    if (firstSellableSku) addSkuToLines(firstSellableSku);
  };

  const updateLine = (cartKey, field, value) => {
    setLines((prev) => prev.map((line) => (
      getLineKey(line) === cartKey ? { ...line, [field]: value } : line
    )));
  };

  const removeLine = (cartKey) => setLines((prev) => prev.filter((line) => getLineKey(line) !== cartKey));

  const subtotal = lines.reduce((sum, line) => (
    sum + Number(line.unitPrice || 0) * Number(line.qty || 0)
  ), 0);
  const isDeposit = orderType === 'Deposit';
  const remaining = isDeposit ? Math.max(0, subtotal - Number(depositAmount || 0)) : 0;

  useEffect(() => {
    setPaidAmount(isDeposit ? String(depositAmount || '') : String(subtotal || ''));
  }, [orderType, subtotal, depositAmount, isDeposit]);

  const handleSubmit = async () => {
    setError('');

    if (lines.length === 0) {
      setError('Vui lòng thêm ít nhất một sản phẩm.');
      return;
    }

    if (lines.some((line) => Number(line.qty) <= 0 || Number(line.unitPrice) < 0)) {
      setError('Số lượng hoặc đơn giá không hợp lệ.');
      return;
    }

    if (isDeposit) {
      const deposit = Number(depositAmount || 0);
      if (deposit <= 0 || deposit >= subtotal) {
        setError('Tiền đặt cọc phải lớn hơn 0 và nhỏ hơn tổng tiền.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        customerId: selectedCustomer?.id ?? null,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        note: note.trim() || null,
        orderType,
        depositAmount: isDeposit ? Number(depositAmount || 0) : 0,
        voucherCode: voucherCode.trim() || null,
        paymentMethod,
        paidAmount: Number(paidAmount || 0),
        lines: lines.map((line) => ({
          skuId: Number.isFinite(Number(line.skuId)) ? Number(line.skuId) : line.skuId,
          qty: Number(line.qty),
          unitPrice: Number(line.unitPrice),
        })),
      };

      const res = await orderService.createPos(payload);
      const orderId = res.data?.id;
      if (orderId) {
        let detail = null;
        try { detail = (await orderService.getById(orderId)).data; } catch { /* ignore */ }
        setCreated({ id: orderId, order: detail });
        resetForm();
      } else {
        navigate('/orders');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Tạo đơn tại quầy thất bại.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <h1 className="m-0">Bán tại quầy (POS)</h1>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {error && <div className="alert alert-danger">{error}</div>}

          {created && (
            <div className="alert alert-success d-flex flex-wrap align-items-center justify-content-between">
              <span>
                <i className="fas fa-check-circle mr-1"></i>
                Đã tạo đơn <strong>{created.order?.code || `#${created.id}`}</strong>
                {created.order ? ` — Tổng: ${formatCurrency(created.order.grandTotal ?? 0)}` : ''}
              </span>
              <span>
                <button type="button" className="btn btn-success btn-sm mr-2" onClick={() => printVatInvoice(created.order || { id: created.id }, settings)}>
                  <i className="fas fa-file-invoice-dollar"></i> Hóa đơn VAT
                </button>
                <button type="button" className="btn btn-outline-primary btn-sm mr-2" onClick={() => navigate(`/orders/${created.id}`)}>
                  <i className="fas fa-eye"></i> Xem đơn
                </button>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setCreated(null)}>
                  <i className="fas fa-plus"></i> Tạo đơn mới
                </button>
              </span>
            </div>
          )}
          <div className="row">
            <div className="col-lg-8">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Sản phẩm</h3>
                </div>
                <div className="card-body">
                  <div className="form-group mb-3">
                    <label>Quét mã vạch/SKU hoặc tìm sản phẩm</label>
                    <div className="input-group">
                      <div className="input-group-prepend">
                        <span className="input-group-text"><i className="fas fa-search"></i></span>
                      </div>
                      <input
                        ref={searchInputRef}
                        className="form-control"
                        value={skuFilter}
                        onChange={(event) => setSkuFilter(event.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Quét mã vạch, nhập SKU hoặc tên sản phẩm..."
                        autoFocus
                      />
                      {skuFilter && (
                        <div className="input-group-append">
                          <button type="button" className="btn btn-outline-secondary" onClick={() => setSkuFilter('')}>
                            Xóa
                          </button>
                        </div>
                      )}
                    </div>
                    <small className="form-text text-muted">
                      Nhấn Enter để thêm nhanh kết quả đầu tiên. Danh sách bên dưới giúp kiểm tra giá và tồn trước khi bán.
                    </small>
                  </div>

                  <div className="mb-3">
                    {!skuFilter.trim() ? (
                      <div className="border rounded p-3 text-muted text-center">
                        Nhập từ khóa hoặc quét mã để tìm sản phẩm cần bán.
                      </div>
                    ) : filteredSkus.length === 0 ? (
                      <div className="border rounded p-3 text-muted text-center">
                        Không tìm thấy SKU phù hợp.
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover table-bordered table-sm mb-0">
                          <thead>
                            <tr>
                              <th style={{ width: 150 }}>SKU</th>
                              <th>Sản phẩm</th>
                              <th style={{ width: 130 }} className="text-right">Giá bán</th>
                              <th style={{ width: 90 }} className="text-right">Tồn</th>
                              <th style={{ width: 90 }} className="text-center">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredSkus.map((sku, index) => {
                              const availableQty = getAvailableQty(sku);
                              const sellable = isSkuSellable(sku);
                              const resultKey = getCartKey(sku) || `${getSkuCode(sku)}-${index}`;
                              return (
                                <tr key={resultKey}>
                                  <td className="align-middle">
                                    <div className="font-weight-bold">{getSkuCode(sku) || 'Không'}</div>
                                    {getBarcode(sku) && <small className="text-muted">{getBarcode(sku)}</small>}
                                  </td>
                                  <td className="align-middle">
                                    <div>{getProductName(sku) || 'Không'}</div>
                                    {getVariantName(sku) && <small className="text-muted">{getVariantName(sku)}</small>}
                                  </td>
                                  <td className="align-middle text-right">{formatCurrency(getSkuPrice(sku))}</td>
                                  <td className="align-middle text-right">
                                    {availableQty === null ? 'Không' : availableQty}
                                  </td>
                                  <td className="align-middle text-center">
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-primary"
                                      onClick={() => addSkuToLines(sku)}
                                      disabled={!sellable}
                                      title={sellable ? 'Thêm vào đơn' : 'Hết hàng'}
                                    >
                                      <i className="fas fa-plus"></i>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="table-responsive">
                    <table className="table table-bordered table-sm">
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Sản phẩm</th>
                          <th style={{ width: 150 }}>Đơn giá</th>
                          <th style={{ width: 110 }}>SL</th>
                          <th className="text-right">Thành tiền</th>
                          <th style={{ width: 50 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="text-center text-muted py-3">Chưa có sản phẩm.</td>
                          </tr>
                        ) : lines.map((line) => (
                          <tr key={getLineKey(line)}>
                            <td>{line.skuCode || 'Không'}</td>
                            <td>
                              <div>{line.productName || 'Không'}</div>
                              {line.variantName && <small className="text-muted">{line.variantName}</small>}
                            </td>
                            <td>
                              <input
                                type="text"
                                inputMode="numeric"
                                className="form-control form-control-sm text-right"
                                value={formatMoneyInput(line.unitPrice)}
                                onChange={(event) => updateLine(getLineKey(line), 'unitPrice', normalizeMoneyInput(event.target.value))}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                className="form-control form-control-sm text-right"
                                value={line.qty}
                                onChange={(event) => updateLine(getLineKey(line), 'qty', Number(event.target.value))}
                              />
                            </td>
                            <td className="text-right align-middle">
                              {formatCurrency(Number(line.unitPrice || 0) * Number(line.qty || 0))}
                            </td>
                            <td className="text-center align-middle">
                              <button type="button" className="btn btn-xs btn-danger" onClick={() => removeLine(getLineKey(line))}>
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Khách & thanh toán</h3>
                </div>
                <div className="card-body">
                  <div className="form-group">
                    <label>Khách hàng</label>
                    {selectedCustomer ? (
                      <div className="d-flex align-items-center flex-wrap">
                        <span className="badge badge-info mr-2">Khách quen</span>
                        <span className="mr-2">{selectedCustomer.fullName}{selectedCustomer.phoneNumber ? ` · ${selectedCustomer.phoneNumber}` : ''}</span>
                        <button type="button" className="btn btn-link btn-sm p-0" onClick={clearCustomer}>Bỏ chọn (khách lẻ)</button>
                      </div>
                    ) : (
                      <>
                        <input
                          className="form-control"
                          value={customerSearch}
                          onChange={(event) => setCustomerSearch(event.target.value)}
                          placeholder="Tìm khách quen theo tên/SĐT..."
                        />
                        {customerSearch && (
                          <div className="list-group mt-1" style={{ maxHeight: 170, overflowY: 'auto' }}>
                            {matchedCustomers.length === 0 ? (
                              <span className="list-group-item py-1 text-muted">Không tìm thấy — để trống = khách lẻ, hoặc nhập tên/SĐT bên dưới.</span>
                            ) : matchedCustomers.map((c) => (
                              <button
                                type="button"
                                key={c.id}
                                className="list-group-item list-group-item-action py-1 text-truncate"
                                style={{ display: 'block', width: '100%', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                title={`${c.fullName}${c.phoneNumber ? ' · ' + c.phoneNumber : ''}${c.email ? ' · ' + c.email : ''}`}
                                onClick={() => selectCustomer(c)}
                              >
                                <strong>{c.fullName}</strong>{c.phoneNumber ? ` · ${c.phoneNumber}` : ''}{c.email ? ` · ${c.email}` : ''}
                              </button>
                            ))}
                          </div>
                        )}
                        <small className="form-text text-muted">Chọn khách quen để gắn đơn vào hồ sơ (tích lũy lịch sử mua). Để trống = khách lẻ.</small>
                      </>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Tên khách (hoặc để trống = khách lẻ)</label>
                    <input
                      className="form-control"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      placeholder="Khách lẻ"
                    />
                  </div>
                  <div className="form-group">
                    <label>Số điện thoại</label>
                    <input className="form-control" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Loại đơn</label>
                    <select className="form-control" value={orderType} onChange={(event) => setOrderType(event.target.value)}>
                      <option value="FullPayment">Bán đứt (trừ kho ngay)</option>
                      <option value="Deposit">Đặt cọc (giữ hàng)</option>
                    </select>
                  </div>
                  {isDeposit && (
                    <div className="form-group">
                      <label>Tiền đặt cọc</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="form-control"
                        value={formatMoneyInput(depositAmount)}
                        onChange={(event) => setDepositAmount(normalizeMoneyInput(event.target.value))}
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Mã voucher (tùy chọn)</label>
                    <input
                      className="form-control"
                      value={voucherCode}
                      onChange={(event) => setVoucherCode(event.target.value)}
                      placeholder="VD: SALE50"
                    />
                  </div>
                  <div className="form-group">
                    <label>Phương thức thanh toán</label>
                    <select className="form-control" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                      <option value="Cash">Tiền mặt</option>
                      <option value="BankTransfer">Chuyển khoản</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tiền thu</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-control"
                      value={formatMoneyInput(paidAmount)}
                      onChange={(event) => setPaidAmount(normalizeMoneyInput(event.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Ghi chú</label>
                    <textarea className="form-control" rows="2" value={note} onChange={(event) => setNote(event.target.value)} />
                  </div>

                  <hr />
                  <table className="table table-sm mb-2">
                    <tbody>
                      <tr>
                        <td>Tạm tính</td>
                        <td className="text-right">{formatCurrency(subtotal)}</td>
                      </tr>
                      {isDeposit && (
                        <tr>
                          <td>Đặt cọc</td>
                          <td className="text-right">{formatCurrency(Number(depositAmount || 0))}</td>
                        </tr>
                      )}
                      {isDeposit && (
                        <tr>
                          <td>Còn lại</td>
                          <td className="text-right font-weight-bold">{formatCurrency(remaining)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <small className="text-muted d-block mb-2">
                    Giảm giá voucher, nếu có, được áp dụng khi tạo đơn.
                  </small>
                  <button type="button" className="btn btn-success btn-block" onClick={handleSubmit} disabled={saving || lines.length === 0}>
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm mr-1"></span>
                        Đang tạo...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check"></i> Tạo đơn & thu tiền
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PosOrder;
