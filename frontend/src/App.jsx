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

// Components
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

// Loading fallback
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
      <div className="flex items-center gap-[6px]">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-[8px] h-[8px] rounded-full bg-[#B5A68C]" style={{ animation: `typingPulse 1.4s ease-in-out ${i * 0.15}s infinite`, opacity: 0.25 }} />
        ))}
      </div>
      <style>{`@keyframes typingPulse { 0%, 80%, 100% { opacity: 0.25; } 40% { opacity: 0.9; } }`}</style>
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

// Root Redirect – show LandingPage immediately, redirect to Chat once auth is confirmed
function RootRedirect() {
  const { user, loading, token } = useAuth();
  const navigate = React.useCallback((path) => window.location.replace(path), []);

  // Once auth check is done and user is confirmed, redirect to chat
  React.useEffect(() => {
    if (!loading && user) {
      navigate('/chat');
    }
  }, [loading, user, navigate]);

  // Always show LandingPage immediately — no blank loading screen
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
          <Route
            path="/analyze"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Analyze />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
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
