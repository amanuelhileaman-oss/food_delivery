import React, { useState } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface Props {
  restaurant: any;
  onUpdate: () => void;
}

export const RestaurantOnboarding: React.FC<Props> = ({ restaurant, onUpdate }) => {
  const [formData, setFormData] = useState({
    description: restaurant.description || '',
    email: restaurant.email || '',
    phone: restaurant.phone || '',
    address: restaurant.address || '',
    latitude: restaurant.latitude || 0,
    longitude: restaurant.longitude || 0,
    openingTime: restaurant.openingTime || '',
    closingTime: restaurant.closingTime || '',
    imageLogo: restaurant.imageLogo || ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'latitude' || name === 'longitude' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/owner/restaurant/${restaurant.id}/application`, formData);
      toast.success('Application submitted successfully!');
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBanner = () => {
    switch (restaurant.status) {
      case 'PENDING':
        return (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
            <h3 className="text-blue-800 font-bold">Action Required</h3>
            <p className="text-blue-700 text-sm mt-1">Please complete your restaurant profile to submit your application for review.</p>
          </div>
        );
      case 'UNDER_REVIEW':
        return (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded-r-lg">
            <h3 className="text-yellow-800 font-bold">Under Review</h3>
            <p className="text-yellow-700 text-sm mt-1">Your application is currently being reviewed by our team. We will notify you once it's approved.</p>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
            <h3 className="text-red-800 font-bold">Application Rejected</h3>
            <p className="text-red-700 text-sm mt-1">Your application was rejected. Please update your information and try again.</p>
          </div>
        );
      case 'SUSPENDED':
        return (
          <div className="bg-gray-50 border-l-4 border-gray-500 p-4 mb-6 rounded-r-lg">
            <h3 className="text-gray-800 font-bold">Account Suspended</h3>
            <p className="text-gray-700 text-sm mt-1">Your restaurant account has been suspended. Please contact support.</p>
          </div>
        );
      default:
        return null;
    }
  };

  const isEditable = restaurant.status === 'PENDING' || restaurant.status === 'REJECTED';

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-8 border-b border-gray-100 bg-gray-50/50">
          <h1 className="text-2xl font-bold text-gray-900">Restaurant Onboarding</h1>
          <p className="text-gray-500 mt-2 text-sm">Complete your profile to start accepting orders on FoodHub.</p>
        </div>
        
        <div className="p-6">
          {renderStatusBanner()}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={!isEditable}
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="Tell customers about your restaurant..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!isEditable}
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={!isEditable}
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={!isEditable}
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opening Time (HH:MM)</label>
                <input
                  type="text"
                  name="openingTime"
                  value={formData.openingTime}
                  onChange={handleChange}
                  disabled={!isEditable}
                  placeholder="08:00"
                  pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Closing Time (HH:MM)</label>
                <input
                  type="text"
                  name="closingTime"
                  value={formData.closingTime}
                  onChange={handleChange}
                  disabled={!isEditable}
                  placeholder="22:00"
                  pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  disabled={!isEditable}
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  disabled={!isEditable}
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>

            {isEditable && (
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 disabled:opacity-50 transition-all shadow-sm"
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
