import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import { Login } from './pages/auth/Login';
import { RegisterCustomer } from './pages/auth/RegisterCustomer';
import { RegisterOwner } from './pages/auth/RegisterOwner';
import { RegisterDriver } from './pages/auth/RegisterDriver';
import { Dashboard } from './pages/Dashboard';

function App() {
  return (
    <AuthProvider>
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
          
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
