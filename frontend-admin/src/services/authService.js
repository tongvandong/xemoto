import api from './api';

const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/users/me'),
};

export default authService;
