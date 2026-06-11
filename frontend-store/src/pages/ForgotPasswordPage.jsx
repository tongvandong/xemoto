import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthForm from '../components/AuthForm.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import { authApi } from '../services/api.js';

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const initialToken = searchParams.get('token') || '';
  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const resetMode = Boolean(token);

  useEffect(() => {
    setEmail(initialEmail);
    setToken(initialToken);
  }, [initialEmail, initialToken]);

  async function handleRequestReset(values) {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await authApi.forgotPassword(values.email);

      if (response.resetToken) {
        const nextEmail = values.email.trim();
        navigate(`/forgot-password?email=${encodeURIComponent(nextEmail)}&token=${encodeURIComponent(response.resetToken)}`, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Không thể tạo yêu cầu đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(values) {
    setLoading(true);
    setError('');
    setMessage('');

    if (values.password !== values.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      setLoading(false);
      return;
    }

    try {
      await authApi.resetPassword({
        email,
        token,
        password: values.password,
      });
      setMessage('Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.');
      setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err) {
      setError(err.message || 'Không thể đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Quên mật khẩu' }]} />
      <AuthForm
        title={resetMode ? 'Đặt lại mật khẩu' : 'Quên mật khẩu'}
        subtitle={resetMode ? 'Nhập mật khẩu mới cho tài khoản của bạn.' : 'Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.'}
        fields={resetMode ? [
          { name: 'password', label: 'Mật khẩu mới', type: 'password', required: true, minLength: 6, placeholder: 'Mật khẩu mới' },
          { name: 'confirmPassword', label: 'Nhập lại mật khẩu', type: 'password', required: true, minLength: 6, placeholder: 'Nhập lại mật khẩu' },
        ] : [
          { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'Email đã đăng ký', defaultValue: email },
        ]}
        submitLabel={resetMode ? 'Đặt lại mật khẩu' : 'Gửi liên kết'}
        loading={loading}
        error={error}
        onSubmit={resetMode ? handleResetPassword : handleRequestReset}
        footer={<p>Đã nhớ mật khẩu? <Link to="/login">Đăng nhập</Link></p>}
      >
        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {message}
          </div>
        )}
      </AuthForm>
    </>
  );
}

export default ForgotPasswordPage;
