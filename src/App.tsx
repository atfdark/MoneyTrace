import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryProvider } from './contexts/QueryProvider';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoadingOverlay } from './components/common/LoadingSpinner';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';

// Lazy load investigator page components
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

// Lazy load customer banking components
const CustomerLayout = lazy(() => import('./components/customer/CustomerLayout').then(m => ({ default: m.CustomerLayout })));
const CustomerLogin = lazy(() => import('./pages/customer/CustomerLogin').then(m => ({ default: m.CustomerLogin })));
const CustomerHome = lazy(() => import('./pages/customer/CustomerHome').then(m => ({ default: m.CustomerHome })));
const CustomerSendMoney = lazy(() => import('./pages/customer/CustomerSendMoney').then(m => ({ default: m.CustomerSendMoney })));
const CustomerTransactions = lazy(() => import('./pages/customer/CustomerTransactions').then(m => ({ default: m.CustomerTransactions })));
const CustomerProfile = lazy(() => import('./pages/customer/CustomerProfile').then(m => ({ default: m.CustomerProfile })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#070B14]">
    <LoadingOverlay isLoading message="Connecting to secure banking engine..." />
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

// Lazy load AuthPortal
const AuthPortal = lazy(() => import('./pages/AuthPortal').then(m => ({ default: m.AuthPortal })));

const LoginPage: React.FC = () => <AuthPortal initialPortal="admin" initialTab="signin" />;
const RegisterPage: React.FC = () => <AuthPortal initialPortal="admin" initialTab="register" />;

const RootRedirect: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();
  if (isLoading) return <LoadingFallback />;
  if (!isAuthenticated) return <Navigate to="/customer/login" replace />;
  if (user?.role === 'customer') return <Navigate to="/customer/home" replace />;
  return <Navigate to="/dashboard" replace />;
};

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* ───── Customer Banking Portal Routes ───── */}
        <Route path="/customer/login" element={<CustomerLogin />} />
        <Route path="/customer/register" element={<CustomerLogin />} />
        <Route
          path="/customer"
          element={
            <ProtectedRoute allowedRoles={['customer', 'admin', 'investigator']} redirectTo="/customer/login">
              <CustomerLayout />
            </ProtectedRoute>
          }
        >
          <Route path="home" element={<CustomerHome />} />
          <Route path="send-money" element={<CustomerSendMoney />} />
          <Route path="transactions" element={<CustomerTransactions />} />
          <Route path="profile" element={<CustomerProfile />} />
          <Route index element={<Navigate to="/customer/home" replace />} />
        </Route>

        {/* ───── Investigator & Admin Portal Routes ───── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route
          element={
            <ProtectedRoute allowedRoles={['admin', 'investigator']} redirectTo="/login">
              <AppLayout />
            </ProtectedRoute>
          }
        >
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