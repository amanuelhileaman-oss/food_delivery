import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import { Login } from './pages/auth/Login';
import { RegisterCustomer } from './pages/auth/RegisterCustomer';
import { RegisterOwner } from './pages/auth/RegisterOwner';
import { RegisterDriver } from './pages/auth/RegisterDriver';
import { Dashboard } from './pages/Dashboard';

import { CustomerLayout } from './components/layouts/CustomerLayout';
import { CustomerDashboard } from './pages/customer/CustomerDashboard';
import { Profile } from './pages/customer/Profile';
import { Addresses } from './pages/customer/Addresses';
import { Favorites } from './pages/customer/Favorites';
import { Orders } from './pages/customer/Orders';

import { OwnerLayout } from './components/layouts/OwnerLayout';
import { OwnerDashboard } from './pages/owner/OwnerDashboard';

import { AdminLayout } from './components/layouts/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { RestaurantApprovals } from './pages/admin/RestaurantApprovals';

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register/customer" element={<RegisterCustomer />} />
          <Route path="/register/owner" element={<RegisterOwner />} />
          <Route path="/register/driver" element={<RegisterDriver />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
          
          {/* Customer Routes */}
          <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
            <Route path="/customer" element={<CustomerLayout />}>
              <Route index element={<CustomerDashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="addresses" element={<Addresses />} />
              <Route path="favorites" element={<Favorites />} />
              <Route path="orders" element={<Orders />} />
            </Route>
          </Route>

          {/* Owner Routes */}
          <Route element={<ProtectedRoute allowedRoles={['RESTAURANT_OWNER']} />}>
            <Route path="/owner" element={<OwnerLayout />}>
              <Route index element={<OwnerDashboard />} />
            </Route>
          </Route>

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="approvals" element={<RestaurantApprovals />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
