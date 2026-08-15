import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryProvider } from './contexts/QueryProvider';
import { AuthProvider } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoadingOverlay } from './components/common/LoadingSpinner';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';

// Lazy load page components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Transactions = lazy(() => import('./pages/Transactions').then(m => ({ default: m.Transactions })));
const Alerts = lazy(() => import('./pages/Alerts').then(m => ({ default: m.Alerts })));
const Investigation = lazy(() => import('./pages/Investigation').then(m => ({ default: m.Investigation })));
const Flow = lazy(() => import('./pages/Flow').then(m => ({ default: m.Flow })));
const Recovery = lazy(() => import('./pages/Recovery').then(m => ({ default: m.Recovery })));
const Chat = lazy(() => import('./pages/Chat').then(m => ({ default: m.Chat })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Unauthorized = lazy(() => import('./pages/Unauthorized').then(m => ({ default: m.Unauthorized })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
    <LoadingOverlay isLoading message="Loading page..." />
  </div>
);

const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <div className="w-full max-w-md glass-panel rounded-2xl p-8 lg:p-10 shadow-2xl">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-secondary-container flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-on-secondary text-[32px]">account_balance</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">MoneyTrace</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Financial Crime Intelligence</p>
      </div>
      {children}
    </div>
  </div>
);

const LoginPage: React.FC = () => (
  <AuthLayout>
    <LoginForm />
  </AuthLayout>
);

const RegisterPage: React.FC = () => (
  <AuthLayout>
    <RegisterForm />
  </AuthLayout>
);

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<div>Forgot Password Page</div>} />
        <Route path="/terms" element={<div>Terms of Service</div>} />
        <Route path="/privacy" element={<div>Privacy Policy</div>} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected Routes */}
        <Route element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/transactions/:id" element={<Transactions />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/alerts/:id" element={<Alerts />} />
          <Route path="/investigation" element={<Investigation />} />
          <Route path="/investigation/:caseId" element={<Investigation />} />
          <Route path="/flow" element={<Flow />} />
          <Route path="/flow/:graphId" element={<Flow />} />
          <Route path="/recovery" element={<Recovery />} />
          <Route path="/recovery/:assetId" element={<Recovery />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/:reportId" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
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