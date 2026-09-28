import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { RestaurantOnboarding } from './RestaurantOnboarding';

export const OwnerDashboard: React.FC = () => {
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestaurant();
  }, []);

  const fetchRestaurant = async () => {
    try {
      const res = await api.get('/owner/restaurant');
      setRestaurant(res.data.data);
    } catch (error) {
      toast.error('Failed to load restaurant details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!restaurant) {
    return <div>No restaurant found.</div>;
  }

  if (restaurant.status !== 'APPROVED') {
    return <RestaurantOnboarding restaurant={restaurant} onUpdate={fetchRestaurant} />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{restaurant.name} Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage your restaurant, menu, and orders.</p>
        </div>
        <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium text-sm">
          Active (Approved)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 font-medium">Total Orders</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 font-medium">Revenue</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">$0.00</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 font-medium">Menu Items</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
        </div>
      </div>
      
      {/* Real app would include order management, menu management here */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Orders</h2>
        <div className="text-center py-10 text-gray-500">
          No orders yet.
        </div>
      </div>
    </div>
  );
};
