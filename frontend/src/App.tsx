import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SignIn } from './features/auth/SignIn';
import { SignUp } from './features/auth/SignUp';
import { ForgotPassword } from './features/auth/ForgotPassword';
import { ResetPassword } from './features/auth/ResetPassword';
import { LoadingScreen } from './components/common/LoadingScreen';
import { Navbar } from './components/layout/Navbar';
import { TopicMenu } from './components/layout/TopicMenu';
import { SortingPage } from './features/sorting/SortingPage';
import { BSTPage } from './features/bst/BSTPage';
import { StackQueuePage } from './features/stackQueue/StackQueuePage';
import { LinkedListPage } from './features/linkedList/LinkedListPage';

/**
 * Protected Route wrapper — redirects to login if not authenticated.
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen message="Checking session..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

/**
 * Guest Route wrapper — redirects to dashboard if already authenticated.
 */
const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen message="Loading..." />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

/**
 * Placeholder component for upcoming module phases
 */
const PlaceholderModule: React.FC<{ title: string }> = ({ title }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100%', minHeight: '400px',
    color: 'var(--text-secondary)', gap: '1rem', padding: '2rem'
  }}>
    <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>{title} Module</h2>
    <p>This module is queued for execution in the next implementation phase.</p>
  </div>
);

/**
 * Main STEM Studio Dashboard Layout with Navbar & Sidebar
 */
const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const pathSegment = location.pathname.split('/')[2] || 'sorting';

  const handleSelectTopic = (topicId: string) => {
    navigate(`/dashboard/${topicId}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        <TopicMenu activeTopic={pathSegment} onSelectTopic={handleSelectTopic} />
        <main style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', overflowY: 'auto' }}>
          <Routes>
            <Route path="/" element={<Navigate to="sorting" replace />} />
            <Route path="sorting" element={<SortingPage />} />
            <Route path="stackQueue" element={<StackQueuePage />} />
            <Route path="linkedList" element={<LinkedListPage />} />
            <Route path="bst" element={<BSTPage />} />
            <Route path="binarySearch" element={<PlaceholderModule title="Binary Search" />} />
            <Route path="graph" element={<PlaceholderModule title="Graph Algorithms" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const AppContent = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<GuestRoute><SignIn /></GuestRoute>} />
      <Route path="/signup" element={<GuestRoute><SignUp /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
      <Route path="/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />
      <Route path="/dashboard/*" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
