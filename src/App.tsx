import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryProvider } from './contexts/QueryProvider';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoadingOverlay } from './components/common/LoadingSpinner';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Transactions = lazy(() => import('./pages/Transactions').then(m => ({ default: m.Transactions })));
const Alerts = lazy(() => import('./pages/Alerts').then(m => ({ default: m.Alerts })));
const Flow = lazy(() => import('./pages/Flow').then(m => ({ default: m.Flow })));
const Recovery = lazy(() => import('./pages/Recovery').then(m => ({ default: m.Recovery })));
const Chat = lazy(() => import('./pages/Chat').then(m => ({ default: m.Chat })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const AuditLogs = lazy(() => import('./pages/AuditLogs').then(m => ({ default: m.AuditLogs })));
const Unauthorized = lazy(() => import('./pages/Unauthorized').then(m => ({ default: m.Unauthorized })));
const ScenarioController = lazy(() => import('./pages/ScenarioController').then(m => ({ default: m.ScenarioController })));


const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#070B14]">
    <LoadingOverlay isLoading message="Connecting to secure banking engine..." />
  </div>
);

const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-card p-8 lg:p-10 shadow-card">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-white text-[32px]">account_balance</span>
        </div>
        <h1 className="text-[17px] font-bold text-gray-900">MoneyTrace</h1>
        <p className="text-[13px] text-gray-500 mt-1">Financial Crime Intelligence</p>
      </div>
      {children}
    </div>
  </div>
);

// Lazy load AuthPortal
const AuthPortal = lazy(() => import('./pages/AuthPortal').then(m => ({ default: m.AuthPortal })));

const LoginPage: React.FC = () => <AuthPortal initialPortal="admin" initialTab="signin" />;
const RegisterPage: React.FC = () => <AuthPortal initialPortal="admin" initialTab="register" />;

const RootRedirect: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingFallback />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to="/dashboard" replace />;
};

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* ───── Investigator & Admin Portal Routes ───── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* ───── Standalone Scenario Controller (Mobile) ───── */}
        <Route
          path="/scenarios"
          element={
            <ProtectedRoute allowedRoles={['admin', 'investigator', 'analyst', 'supervisor', 'executive']} redirectTo="/login">
              <ScenarioController />
            </ProtectedRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute allowedRoles={['admin', 'investigator', 'analyst', 'supervisor', 'executive']} redirectTo="/login">
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/transactions/:id" element={<Transactions />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/alerts/:id" element={<Alerts />} />
          <Route path="/flow" element={<Flow />} />
          <Route path="/flow/:graphId" element={<Flow />} />
          <Route path="/recovery" element={<Recovery />} />
          <Route path="/recovery/:assetId" element={<Recovery />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/:reportId" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* ───── Root & Catch-All Routing ───── */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </Suspense>
  );
};

const App: React.FC = () => {
  return (
    <QueryProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryProvider>
  );
};

export default App;