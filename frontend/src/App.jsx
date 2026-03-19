import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserProfileProvider } from './contexts/UserProfileContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import DesignPreview from './pages/DesignPreview';
import Analyze from './pages/Analyze';
import Library from './pages/Library';
import LibraryDetail from './pages/LibraryDetail';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Tools from './pages/Tools';
import Chat from './pages/Chat';
import Admin from './pages/Admin';
import LandingPage from './pages/LandingPage';
import Impressum from './pages/Impressum';
import Datenschutz from './pages/Datenschutz';

// Components
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

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
      <main className="flex-1 overflow-y-auto pt-[60px] md:pt-0">
        {children}
      </main>
    </div>
  );
}

// Root Redirect – show LandingPage for guests, Chat for logged-in users
function RootRedirect() {
  const { user, loading } = useAuth();
  const [slowLoad, setSlowLoad] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setSlowLoad(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <div className="text-center">
          <div className="w-10 h-10 border-[1.5px] border-[#E8E0D4] border-t-[#B5A68C] rounded-full mx-auto mb-4" style={{ animation: 'spin 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}></div>
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
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/design-preview" element={<DesignPreview />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/datenschutz" element={<Datenschutz />} />

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
        </UserProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
