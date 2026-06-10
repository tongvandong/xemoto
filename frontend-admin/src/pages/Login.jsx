import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f9]">
      <div className="w-[360px] max-w-[calc(100vw-2rem)]">
        <div className="mb-4 text-center text-[2.1rem]">
          <a className="text-primary hover:text-[#0056b3]" href="/"><b>MoToSale</b> Admin</a>
        </div>
        <div className="relative mb-4 flex min-w-0 flex-col rounded border border-black/10 bg-white shadow-[0_0_1px_rgba(0,0,0,0.125),0_1px_3px_rgba(0,0,0,0.2)]">
          <div className="p-5 text-[#666]">
            <p className="m-0 px-5 pb-5 text-center">Đăng nhập để quản trị hệ thống</p>

            {error && (
              <div className="relative mb-4 rounded border border-[#f5c6cb] bg-[#f8d7da] px-5 py-3 text-[#721c24]">
                <button type="button" className="float-right border-0 bg-transparent text-2xl font-bold leading-none text-black opacity-50" onClick={() => setError('')}>
                  &times;
                </button>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4 flex w-full items-stretch">
                <input
                  type="text"
                  className="relative block h-[calc(2.25rem+2px)] w-full min-w-0 flex-auto rounded-l border border-[#ced4da] bg-white px-3 py-1.5 text-[#495057] transition focus:z-[1] focus:border-[#80bdff] focus:outline-none focus:ring-4 focus:ring-primary/25"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <div className="flex">
                  <div className="flex items-center rounded-r border border-l-0 border-[#ced4da] bg-[#e9ecef] px-3 py-1.5 text-center text-[#495057]">
                    <span className="fas fa-envelope"></span>
                  </div>
                </div>
              </div>
              <div className="mb-4 flex w-full items-stretch">
                <input
                  type="password"
                  className="relative block h-[calc(2.25rem+2px)] w-full min-w-0 flex-auto rounded-l border border-[#ced4da] bg-white px-3 py-1.5 text-[#495057] transition focus:z-[1] focus:border-[#80bdff] focus:outline-none focus:ring-4 focus:ring-primary/25"
                  placeholder="Mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="flex">
                  <div className="flex items-center rounded-r border border-l-0 border-[#ced4da] bg-[#e9ecef] px-3 py-1.5 text-center text-[#495057]">
                    <span className="fas fa-lock"></span>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1 rounded border border-primary bg-primary px-3 py-1.5 text-white transition hover:bg-[#0069d9] disabled:pointer-events-none disabled:opacity-65"
                disabled={loading}
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-[0.2em] border-current border-r-transparent"></span>
                ) : 'Đăng nhập'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
