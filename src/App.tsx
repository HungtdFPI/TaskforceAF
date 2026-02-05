import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'sonner';

import LoginPage from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
import RoleDispatcher from './pages/RoleDispatcher';
import LecturerDashboard from './pages/LecturerDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProfilePage from './pages/Profile';
// import StudentAffairsDashboard from './pages/StudentAffairsDashboard';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white flex-col gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="text-lg font-mono text-slate-300">Authenticating...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }>
            <Route index element={<RoleDispatcher />} />
            <Route path="my-reports" element={<LecturerDashboard />} />
            <Route path="approve-reports" element={<ManagerDashboard />} />
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="profile" element={<ProfilePage />} />
            {/* <Route path="student-affairs" element={<StudentAffairsDashboard />} /> */}
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}

export default App;
