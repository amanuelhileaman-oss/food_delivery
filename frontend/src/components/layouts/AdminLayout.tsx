import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Home, CheckSquare, Users } from 'lucide-react';

export const AdminLayout = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: Home },
    { name: 'Approvals', path: '/admin/approvals', icon: CheckSquare },
    { name: 'Users', path: '/admin/users', icon: Users },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Admin Portal</h2>
          <p className="text-sm text-gray-500 mt-1">{user?.name}</p>
        </div>
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-red-50 text-red-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
          
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full p-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors mt-8"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};
