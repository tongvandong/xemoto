import Field from '../forms/Field.jsx';
import SectionCard from '../common/SectionCard.jsx';

// Hồ sơ trả góp: thông tin cá nhân + công việc của người vay (chỉ hiện khi chọn trả góp).
function InstallmentProfileSection({ form, fieldErrors, onChange }) {
  return (
    <SectionCard title="Hồ sơ trả góp">
      <p className="mt-1 text-sm text-zinc-500">Vui lòng cung cấp thông tin chính xác để cửa hàng thẩm định hồ sơ.</p>

      <div className="mt-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">Thông tin cá nhân</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Họ và tên người vay *" id="installmentBorrowerName" name="installmentBorrowerName" value={form.installmentBorrowerName} onChange={onChange} error={fieldErrors.installmentBorrowerName} placeholder="Nguyễn Văn A" />
          <Field label="Số CCCD/CMND *" id="installmentIdNumber" name="installmentIdNumber" value={form.installmentIdNumber} onChange={onChange} error={fieldErrors.installmentIdNumber} placeholder="0123456789" />
          <Field label="Ngày cấp CCCD *" id="installmentIdIssueDate" name="installmentIdIssueDate" value={form.installmentIdIssueDate} onChange={onChange} error={fieldErrors.installmentIdIssueDate} type="date" />
          <Field label="Nơi cấp CCCD *" id="installmentIdIssuePlace" name="installmentIdIssuePlace" value={form.installmentIdIssuePlace} onChange={onChange} error={fieldErrors.installmentIdIssuePlace} placeholder="VD: Cục CS QLHC về TTXH" />
          <Field label="Ngày sinh" id="installmentBirthDate" name="installmentBirthDate" value={form.installmentBirthDate} onChange={onChange} type="date" />
          <Field label="Số điện thoại người vay *" id="installmentPhone" name="installmentPhone" value={form.installmentPhone} onChange={onChange} error={fieldErrors.installmentPhone} placeholder="0912345678" type="tel" />
        </div>
        <div className="mt-4">
          <Field label="Địa chỉ thường trú *" id="installmentResidence" name="installmentResidence" value={form.installmentResidence} onChange={onChange} error={fieldErrors.installmentResidence} placeholder="Số nhà, đường, phường, quận, tỉnh/thành" />
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">Công việc &amp; thu nhập</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Nghề nghiệp" id="installmentOccupation" name="installmentOccupation" value={form.installmentOccupation} onChange={onChange} placeholder="VD: Nhân viên văn phòng" />
          <Field label="Công ty đang làm" id="installmentCompany" name="installmentCompany" value={form.installmentCompany} onChange={onChange} placeholder="Tên công ty/cửa hàng" />
          <Field label="Thời gian làm việc (tháng)" id="installmentWorkMonths" name="installmentWorkMonths" value={form.installmentWorkMonths} onChange={onChange} placeholder="24" type="number" />
          <Field label="Thu nhập hàng tháng (VND)" id="installmentMonthlyIncome" name="installmentMonthlyIncome" value={form.installmentMonthlyIncome} onChange={onChange} placeholder="15000000" type="number" />
        </div>
      </div>
    </SectionCard>
  );
}

export default InstallmentProfileSection;
