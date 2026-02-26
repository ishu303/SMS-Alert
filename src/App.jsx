import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ComposeNotificationPage from './pages/ComposeNotificationPage';
import NotificationHistoryPage from './pages/NotificationHistoryPage';
import StudentManagementPage from './pages/StudentManagementPage';
import './index.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <p>Loading...</p>
    </div>
  );
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="compose" element={<ComposeNotificationPage />} />
        <Route path="history" element={<NotificationHistoryPage />} />
        <Route path="students" element={<StudentManagementPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e2340',
              color: '#e2e8f0',
              border: '1px solid #2a3052',
              borderRadius: '12px',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
