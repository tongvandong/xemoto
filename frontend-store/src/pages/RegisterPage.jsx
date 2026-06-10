import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(values) {
    setLoading(true);
    setError('');

    try {
      await register({
        name: `${values.lastName || ''} ${values.firstName || ''}`.trim(),
        username: values.email,
        email: values.email,
        phone: values.phone,
        password: values.password,
      });

      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Đăng ký' }]} />
      <AuthForm
        title="Đăng ký tài khoản"
        subtitle="Tạo tài khoản để theo dõi giỏ hàng và đơn mua xe."
        fields={[
          { name: 'lastName', label: 'Họ', type: 'text', required: true, placeholder: 'Họ' },
          { name: 'firstName', label: 'Tên', type: 'text', required: true, placeholder: 'Tên' },
          { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'Email' },
          { name: 'phone', label: 'Số điện thoại', type: 'tel', required: true, placeholder: 'Số điện thoại' },
          { name: 'password', label: 'Mật khẩu', type: 'password', required: true, minLength: 6, placeholder: 'Mật khẩu' },
        ]}
        submitLabel="Đăng ký"
        loading={loading}
        error={error}
        onSubmit={handleSubmit}
        footer={<p>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>}
      />
    </>
  );
}

export default RegisterPage;
