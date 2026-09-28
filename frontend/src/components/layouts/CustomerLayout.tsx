import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Home, User, MapPin, Heart, ShoppingBag, LogOut, Menu, X } from 'lucide-react';

export const CustomerLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/customer', icon: <Home size={20} /> },
    { name: 'Profile', path: '/customer/profile', icon: <User size={20} /> },
    { name: 'Addresses', path: '/customer/addresses', icon: <MapPin size={20} /> },
    { name: 'Favorites', path: '/customer/favorites', icon: <Heart size={20} /> },
    { name: 'Orders', path: '/customer/orders', icon: <ShoppingBag size={20} /> },
  ];

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b">
        <h2 className="text-2xl font-bold text-indigo-600">FoodDelivery</h2>
        <p className="text-sm text-gray-500 mt-1">Welcome, {user?.firstName}</p>
      </div>
      <nav className="p-4 space-y-2 flex-grow">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link 
              key={link.path}
              to={link.path} 
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'}`}
            >
              {link.icon} {link.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t mt-auto">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 p-3 w-full text-left text-red-600 rounded-lg hover:bg-red-50 transition-colors"
        >
          <LogOut size={20} /> Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center z-20">
        <h2 className="text-xl font-bold text-indigo-600">FoodDelivery</h2>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-600 hover:text-gray-900">
          {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar - Desktop and Mobile Drawer */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-40 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto h-[calc(100vh-60px)] md:h-screen w-full">
        <Outlet />
      </main>
    </div>
  );
};
