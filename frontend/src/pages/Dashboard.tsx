import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role?.name === 'CUSTOMER') {
        navigate('/customer', { replace: true });
      } else if (user.role?.name === 'RESTAURANT_OWNER') {
        navigate('/owner', { replace: true });
      } else if (user.role?.name === 'DRIVER') {
        navigate('/driver', { replace: true });
      } else if (user.role?.name === 'ADMIN') {
        navigate('/admin', { replace: true });
      }
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      <p className="mt-4 text-gray-500">Loading your dashboard...</p>
    </div>
  );
};
