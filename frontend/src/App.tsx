import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Moon, Sun, Monitor, LogOut } from 'lucide-react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SignIn } from './features/auth/SignIn';
import { SignUp } from './features/auth/SignUp';
import { ForgotPassword } from './features/auth/ForgotPassword';
import { LoadingScreen } from './components/common/LoadingScreen';

const ThemeToggleButton = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle Theme">
      {theme === 'light' ? <Sun size={20} /> : theme === 'dark' ? <Moon size={20} /> : <Monitor size={20} />}
    </button>
  );
};

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
 * Simple dashboard placeholder — shows after successful login.
 */
const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: '1.5rem',
      backgroundColor: 'var(--bg-secondary)', padding: '2rem'
    }}>
      <div className="auth-card animate-fade-in" style={{ textAlign: 'center' }}>
        <img src="/logo.png" alt="STEM Studio" style={{ maxWidth: '100px', marginBottom: '1rem' }}
          onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
        <h1 className="auth-title" style={{ marginBottom: '0.5rem' }}>
          Welcome, {user?.username}!
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          You are signed in as <strong>{user?.email}</strong>
        </p>
        <button onClick={logout} className="auth-button" style={{ maxWidth: '200px', margin: '0 auto' }}>
          <LogOut size={18} />
          Sign Out
        </button>
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
    <>
      <ThemeToggleButton />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<GuestRoute><SignIn /></GuestRoute>} />
        <Route path="/signup" element={<GuestRoute><SignUp /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      </Routes>
    </>
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
