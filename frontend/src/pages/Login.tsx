import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        email,
        password,
      });

      if (response.status === 200 && response.data) {
        const { accessToken, refreshToken, user } = response.data;
        
        if (!accessToken || !refreshToken || !user) {
          throw new Error('Invalid response from server');
        }

        const { userId, firstName, lastName, role, email: userEmail, tenantId, createdBy, phoneNumber } = user;

        // Store in Zustand (also updates sessionStorage)
        login({ 
          userId, 
          firstName, 
          lastName, 
          email: userEmail, 
          role, 
          tenantId, 
          createdBy, 
          phoneNumber, 
          accessToken, 
          refreshToken 
        });

        // Set axios default for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

        // Store in both session and local storage
        sessionStorage.setItem('accessToken', accessToken);
        sessionStorage.setItem('refreshToken', refreshToken);
        sessionStorage.setItem('user', JSON.stringify(user));

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));

        // Navigate
        navigate('/');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      let message = 'Login failed. Please check your credentials and try again.';
      
      if (err.response?.data?.message) {
        message = err.response.data.message;
      } else if (err.message) {
        message = err.message;
      }
      
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Sharp CRM</h2>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
          <input
              id="email"
            type="email"
              placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 px-4 py-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
          <input
              id="password"
            type="password"
              placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 px-4 py-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isLoading ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
