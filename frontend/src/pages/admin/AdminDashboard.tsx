import { useAuth } from '../../context/AuthContext';
import { Activity, Users, Store, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name}</h1>
        <p className="text-gray-600 mt-2">Here is what's happening on the platform today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 font-medium">Pending Approvals</h3>
            <div className="p-2 bg-orange-100 rounded-lg">
              <CheckCircle className="text-orange-600" size={24} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">12</p>
          <Link to="/admin/approvals" className="text-sm text-red-600 hover:text-red-700 mt-2 inline-block font-medium">
            Review applications &rarr;
          </Link>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 font-medium">Active Restaurants</h3>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Store className="text-blue-600" size={24} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">145</p>
          <p className="text-sm text-green-600 mt-2 font-medium">+5 this week</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 font-medium">Total Users</h3>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="text-purple-600" size={24} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">3,204</p>
          <p className="text-sm text-green-600 mt-2 font-medium">+120 this month</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 font-medium">System Status</h3>
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="text-green-600" size={24} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">100%</p>
          <p className="text-sm text-gray-500 mt-2 font-medium">All systems operational</p>
        </div>
      </div>
    </div>
  );
};
