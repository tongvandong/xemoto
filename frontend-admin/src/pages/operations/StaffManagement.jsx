import React, { useEffect, useState } from 'react';
import advancedOperationsService from '../../services/advancedOperationsService';
import businessOperationsService from '../../services/businessOperationsService';
import { formatDate } from '../../utils/formatDate';
import { useAuth } from '../../contexts/AuthContext';

const emptyShift = { id: null, staffUserId: '', startsAt: '', endsAt: '', shiftStatus: 'Scheduled', note: '' };
const emptyAttendance = { staffUserId: '', note: '' };

const labels = { Scheduled: 'Đã phân ca', Completed: 'Hoàn thành', Cancelled: 'Đã hủy' };
const badge = (value) => (
  <span className={`badge badge-${value === 'Completed' ? 'success' : value === 'Cancelled' ? 'danger' : 'info'}`}>{labels[value] || value}</span>
);
const message = (err, fallback) => err?.response?.data?.message || fallback;
const toLocalInput = (value) => (value ? new Date(value).toISOString().slice(0, 16) : '');

const StaffManagement = () => {
  const { user, isAdmin } = useAuth();
  const [tab, setTab] = useState('shifts');
  const [shifts, setShifts] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [staff, setStaff] = useState([]);
  const [error, setError] = useState('');
  const [showShift, setShowShift] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [shiftForm, setShiftForm] = useState(emptyShift);
  const [checkInForm, setCheckInForm] = useState(emptyAttendance);

  const load = async () => {
    setError('');
    try {
      const [shiftRes, attendanceRes, lookupRes] = await Promise.all([
        advancedOperationsService.getShifts(),
        businessOperationsService.getAttendance(),
        businessOperationsService.getLookups(),
      ]);
      setShifts(shiftRes.data.items || []);
      setAttendance(attendanceRes.data.items || []);
      setStaff(lookupRes.data.staff || []);
    } catch (err) {
      setError(message(err, 'Không thể tải dữ liệu nhân sự / ca làm.'));
    }
  };

  useEffect(() => { load(); }, []);

  const run = async (action) => {
    try { await action(); await load(); }
    catch (err) { alert(message(err, 'Thao tác thất bại.')); }
  };

  const saveShift = async () => {
    if (!shiftForm.staffUserId || !shiftForm.startsAt || !shiftForm.endsAt) {
      alert('Vui lòng chọn nhân viên và thời gian ca.');
      return;
    }
    try {
      if (shiftForm.id) {
        await advancedOperationsService.updateShift(shiftForm.id, {
          startsAt: shiftForm.startsAt, endsAt: shiftForm.endsAt, shiftStatus: shiftForm.shiftStatus, note: shiftForm.note || null,
        });
      } else {
        await advancedOperationsService.createShift({
          staffUserId: Number(shiftForm.staffUserId), startsAt: shiftForm.startsAt, endsAt: shiftForm.endsAt, note: shiftForm.note || null,
        });
      }
      setShowShift(false);
      setShiftForm(emptyShift);
      await load();
    } catch (err) {
      alert(message(err, 'Lưu ca làm việc thất bại.'));
    }
  };

  const editShift = (row) => {
    setShiftForm({ ...row, startsAt: toLocalInput(row.startsAt), endsAt: toLocalInput(row.endsAt) });
    setShowShift(true);
  };
  const cancelShift = (id) => {
    if (!window.confirm('Hủy ca làm việc này?')) return;
    run(() => advancedOperationsService.deleteShift(id));
  };

  const checkIn = async () => {
    if (!checkInForm.staffUserId) { alert('Vui lòng chọn nhân viên.'); return; }
    try {
      await businessOperationsService.checkIn({ staffUserId: Number(checkInForm.staffUserId), note: checkInForm.note || null });
      setShowCheckIn(false);
      setCheckInForm(emptyAttendance);
      await load();
    } catch (err) {
      alert(message(err, 'Check-in thất bại.'));
    }
  };

  const openCheckIn = () => {
    setCheckInForm({ ...emptyAttendance, staffUserId: isAdmin() ? '' : (user?.id || user?.Id || '') });
    setShowCheckIn(true);
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid"><h1 className="m-0">Nhân sự / Ca làm</h1></div>
      </div>
      <section className="content">
        <div className="container-fluid">
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="card">
            <div className="card-header border-b border-slate-200 px-4 pt-3">
              <div className="flex flex-wrap gap-x-2 gap-y-1" role="tablist" aria-label="Nhân sự và ca làm">
                {[['shifts', 'Phân ca'], ['attendance', 'Chấm công']].map(([key, text]) => (
                  <button key={key} type="button" role="tab" aria-selected={tab === key}
                    className={`border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${tab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'}`}
                    onClick={() => setTab(key)}>
                    {text}
                  </button>
                ))}
              </div>
            </div>
            <div className="card-body">
              {tab === 'shifts' && (
                <>
                  {isAdmin() && (
                    <button className="btn btn-primary mb-3" onClick={() => { setShiftForm(emptyShift); setShowShift(true); }}>
                      <i className="fas fa-plus mr-1" />Phân ca
                    </button>
                  )}
                  <Table headers={['Nhân viên', 'Bắt đầu', 'Kết thúc', 'Trạng thái', 'Thao tác']} empty="Chưa có ca làm việc.">
                    {shifts.map((row) => (
                      <tr key={row.id}>
                        <td>{row.staffName}</td>
                        <td>{formatDate(row.startsAt)}</td>
                        <td>{formatDate(row.endsAt)}</td>
                        <td>{badge(row.shiftStatus)}</td>
                        <td>
                          {isAdmin() && row.shiftStatus !== 'Cancelled' && (
                            <>
                              <button className="btn btn-info btn-xs mr-1" onClick={() => editShift(row)}><i className="fas fa-edit" /></button>
                              <button className="btn btn-danger btn-xs" onClick={() => cancelShift(row.id)}><i className="fas fa-ban" /></button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </Table>
                </>
              )}

              {tab === 'attendance' && (
                <>
                  <button className="btn btn-primary mb-3" onClick={openCheckIn}><i className="fas fa-sign-in-alt mr-1" />Check-in</button>
                  <Table headers={['Nhân viên', 'Check-in', 'Check-out', 'Ghi chú', 'Thao tác']} empty="Chưa có dữ liệu chấm công.">
                    {attendance.map((row) => (
                      <tr key={row.id}>
                        <td>{row.staffName}</td>
                        <td>{formatDate(row.checkInAt)}</td>
                        <td>{formatDate(row.checkOutAt)}</td>
                        <td>{row.note || '-'}</td>
                        <td>{!row.checkOutAt && <button className="btn btn-warning btn-xs" onClick={() => run(() => businessOperationsService.checkOut(row.id))}>Check-out</button>}</td>
                      </tr>
                    ))}
                  </Table>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {showShift && (
        <Modal title={shiftForm.id ? 'Cập nhật ca làm việc' : 'Phân ca nhân viên'} close={() => setShowShift(false)} save={saveShift}>
          {!shiftForm.id && <Select label="Nhân viên" value={shiftForm.staffUserId} set={(v) => setShiftForm({ ...shiftForm, staffUserId: v })} items={staff} option={(x) => `${x.fullName} - ${x.email}`} />}
          <Field label="Bắt đầu" type="datetime-local" value={shiftForm.startsAt} set={(v) => setShiftForm({ ...shiftForm, startsAt: v })} />
          <Field label="Kết thúc" type="datetime-local" value={shiftForm.endsAt} set={(v) => setShiftForm({ ...shiftForm, endsAt: v })} />
          {shiftForm.id && <Select label="Trạng thái" value={shiftForm.shiftStatus} set={(v) => setShiftForm({ ...shiftForm, shiftStatus: v })} items={[{ id: 'Scheduled', name: 'Đã phân ca' }, { id: 'Completed', name: 'Hoàn thành' }, { id: 'Cancelled', name: 'Đã hủy' }]} option={(x) => x.name} />}
          <Field label="Ghi chú" value={shiftForm.note || ''} set={(v) => setShiftForm({ ...shiftForm, note: v })} />
        </Modal>
      )}

      {showCheckIn && (
        <Modal title="Check-in nhân viên" close={() => setShowCheckIn(false)} save={checkIn}>
          <div className="form-group">
            <label>Nhân viên</label>
            <select className="form-control" disabled={!isAdmin()} value={checkInForm.staffUserId} onChange={(e) => setCheckInForm({ ...checkInForm, staffUserId: e.target.value })}>
              <option value="">-- Chọn --</option>
              {staff.map((x) => <option key={x.id} value={x.id}>{x.fullName}</option>)}
            </select>
          </div>
          <Field label="Ghi chú" value={checkInForm.note || ''} set={(v) => setCheckInForm({ ...checkInForm, note: v })} />
        </Modal>
      )}
    </div>
  );
};

const Table = ({ headers, empty, children }) => (
  <div className="table-responsive">
    <table className="table table-bordered table-striped">
      <thead><tr>{headers.map((x) => <th key={x}>{x}</th>)}</tr></thead>
      <tbody>{React.Children.count(children) ? children : <tr><td colSpan={headers.length} className="text-center text-muted">{empty}</td></tr>}</tbody>
    </table>
  </div>
);
const Field = ({ label, value, set, type = 'text', min }) => <div className="form-group"><label>{label}</label><input type={type} min={min} className="form-control" value={value} onChange={(e) => set(e.target.value)} /></div>;
const Select = ({ label, value, set, items = [], option }) => <div className="form-group"><label>{label}</label><select className="form-control" value={value} onChange={(e) => set(e.target.value)}><option value="">-- Chọn --</option>{items.map((x) => <option key={x.id} value={x.id}>{option(x)}</option>)}</select></div>;
const Modal = ({ title, close, save, children }) => <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,.5)' }}><div className="modal-dialog modal-lg"><div className="modal-content"><div className="modal-header"><h5>{title}</h5><button className="close" onClick={close}>&times;</button></div><div className="modal-body">{children}</div><div className="modal-footer"><button className="btn btn-secondary" onClick={close}>Đóng</button>{save && <button className="btn btn-primary" onClick={save}>Lưu</button>}</div></div></div></div>;

export default StaffManagement;
