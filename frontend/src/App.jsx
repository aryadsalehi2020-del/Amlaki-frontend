import React, { useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserProfileProvider } from './contexts/UserProfileContext';

// Landing Page loaded immediately (first paint)
import LandingPage from './pages/LandingPage';

// Everything else lazy-loaded
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const DesignPreview = React.lazy(() => import('./pages/DesignPreview'));
const Analyze = React.lazy(() => import('./pages/Analyze'));
const Library = React.lazy(() => import('./pages/Library'));
const LibraryDetail = React.lazy(() => import('./pages/LibraryDetail'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Tools = React.lazy(() => import('./pages/Tools'));
const Chat = React.lazy(() => import('./pages/Chat'));
const Admin = React.lazy(() => import('./pages/Admin'));
const Pricing = React.lazy(() => import('./pages/Pricing'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const Impressum = React.lazy(() => import('./pages/Impressum'));
const Datenschutz = React.lazy(() => import('./pages/Datenschutz'));
const BlogIndex = React.lazy(() => import('./pages/BlogIndex'));
const BlogArticle = React.lazy(() => import('./pages/BlogArticle'));
const Redeem = React.lazy(() => import('./pages/Redeem'));

// Components
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

// Loading fallback
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
      <div className="flex items-center gap-[6px]">
        <span className="loading-dot" />
        <span className="loading-dot" />
        <span className="loading-dot" />
      </div>
    </div>
  );
}

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    // Also scroll the main content area
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}

// Layout Component für eingeloggte User
function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-[60px] md:pt-0 bg-[#FAF7F2]">
        {children}
      </main>
    </div>
  );
}

// Minimal layout for guest users on /analyze
function GuestLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4 sm:px-6" style={{ background: 'rgba(250,247,242,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(196,184,158,0.25)' }}>
        <a href="/" className="text-xl font-bold tracking-tight select-none">
          <span className="font-extrabold text-[#7C8B6F]">A</span>
          <span className="text-[#2C2418]">mlak</span>
          <span className="font-extrabold text-[#7C8B6F]">I</span>
        </a>
        <a href="/login" className="text-sm font-medium px-4 py-2 rounded-full border border-[#E8E0D4] text-[#5C4F3D] hover:border-[#B5A68C] transition-all">
          Anmelden
        </a>
      </nav>
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}

// Analyze route – shows sidebar for logged-in users, minimal nav for guests
function AnalyzeRoute() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (user) {
    return (
      <DashboardLayout>
        <Suspense fallback={<PageLoader />}>
          <Analyze />
        </Suspense>
      </DashboardLayout>
    );
  }

  return (
    <GuestLayout>
      <Suspense fallback={<PageLoader />}>
        <Analyze />
      </Suspense>
    </GuestLayout>
  );
}

// Root Redirect – show LandingPage for guests, Chat for logged-in users
function RootRedirect() {
  const { user, loading, token } = useAuth();
  const [slowLoad, setSlowLoad] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setSlowLoad(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  // No token = no login session → show landing page immediately
  if (!token) {
    return <LandingPage />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <div className="text-center">
          <div className="flex items-center gap-[6px] mx-auto mb-4 justify-center">
            <span className="loading-dot" />
            <span className="loading-dot" />
            <span className="loading-dot" />
          </div>
          <p className="text-[#8C7E6A] text-sm">{slowLoad ? 'Server wird gestartet, einen Moment...' : 'Lade...'}</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/chat" replace />;
  }

  return <LandingPage />;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <UserProfileProvider>
        <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/design-preview" element={<DesignPreview />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="/blog" element={<BlogIndex />} />
          <Route path="/blog/:slug" element={<BlogArticle />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/redeem/:token" element={<Redeem />} />

          {/* Protected Routes with Sidebar */}
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Chat />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:conversationId"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Chat />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          {/* /dashboard removed – Chat is the main entry point */}
          <Route path="/analyze" element={<AnalyzeRoute />} />
          <Route
            path="/library"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Library />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/library/:id"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <LibraryDetail />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Settings />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Profile />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Tools />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pricing"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Pricing />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Admin />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        </UserProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
