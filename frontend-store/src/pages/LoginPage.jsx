import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthForm from '../components/AuthForm.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(values) {
    setLoading(true);
    setError('');

    try {
      await login(values);
      navigate(searchParams.get('redirect') || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Đăng nhập' }]} />
      <AuthForm
        title="Đăng nhập tài khoản"
        subtitle="Nhập email hoặc số điện thoại để tiếp tục mua hàng."
        fields={[
          { name: 'username', label: 'Email hoặc số điện thoại', type: 'text', required: true, placeholder: 'Email hoặc số điện thoại' },
          { name: 'password', label: 'Mật khẩu', type: 'password', required: true, placeholder: 'Mật khẩu' },
        ]}
        submitLabel="Đăng nhập"
        loading={loading}
        error={error}
        onSubmit={handleSubmit}
        footer={<p>Chưa có tài khoản? <Link to="/register">Đăng ký</Link></p>}
      >
        <label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-zinc-600">
          <input
            type="checkbox"
            name="rememberMe"
            value="true"
            disabled={loading}
            className="h-4 w-4 rounded border-zinc-300 text-[#d71920] focus:ring-[#d71920]"
          />
          <span>Ghi nhớ tôi</span>
        </label>
      </AuthForm>
    </>
  );
}

export default LoginPage;
