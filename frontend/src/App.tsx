import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPromptProvider, useAuthPrompt } from './contexts/AuthPromptContext';
import { MascotProvider } from './components/mascot';
import { LoadingScreen } from './components/common/LoadingScreen';
import { BootSplash } from './components/common/BootSplash';
import { ScrollToTop } from './components/common/ScrollToTop';
import { Navbar } from './components/layout/Navbar';
import { TopicMenu } from './components/layout/TopicMenu';
import { MODULES, DSA_CATEGORIES, OS_CATEGORIES } from './data/categories';
import { TutorProvider } from './contexts/TutorContext';
import { OctaTutor } from './components/tutor/OctaTutor';
import { NotFoundPage } from './features/NotFoundPage';
import { MarketingHome } from './features/marketing/MarketingHome';
import { MarketingFooter } from './features/marketing/MarketingFooter';
import { OwnerControlCenter } from './features/owner/OwnerControlCenter';
import { apiClient } from './api/apiClient';

// Lazy-loaded page components for code-splitting
const DashboardHome = lazy(() => import('./features/dashboard/DashboardHome').then(m => ({ default: m.DashboardHome })));
const ModuleHub = lazy(() => import('./features/hub/ModuleHub').then(m => ({ default: m.ModuleHub })));
const ComplexityPage = lazy(() => import('./features/complexity/ComplexityPage').then(m => ({ default: m.ComplexityPage })));
const SortingPage = lazy(() => import('./features/sorting/SortingPage').then(m => ({ default: m.SortingPage })));
const BSTPage = lazy(() => import('./features/bst/BSTPage').then(m => ({ default: m.BSTPage })));
const StackQueuePage = lazy(() => import('./features/stackQueue/StackQueuePage').then(m => ({ default: m.StackQueuePage })));
const LinkedListPage = lazy(() => import('./features/linkedList/LinkedListPage').then(m => ({ default: m.LinkedListPage })));
const BinarySearchPage = lazy(() => import('./features/binarySearch/BinarySearchPage').then(m => ({ default: m.BinarySearchPage })));
const GraphPage = lazy(() => import('./features/graph/GraphPage').then(m => ({ default: m.GraphPage })));
const ArraysPage = lazy(() => import('./features/arrays/ArraysPage').then(m => ({ default: m.ArraysPage })));
const StringsPage = lazy(() => import('./features/strings/StringsPage').then(m => ({ default: m.StringsPage })));
const RecursionPage = lazy(() => import('./features/recursion/RecursionPage').then(m => ({ default: m.RecursionPage })));
const GreedyPage = lazy(() => import('./features/greedy/GreedyPage').then(m => ({ default: m.GreedyPage })));
const HashMapsPage = lazy(() => import('./features/hashMaps/HashMapsPage').then(m => ({ default: m.HashMapsPage })));
const BacktrackingPage = lazy(() => import('./features/backtracking/BacktrackingPage').then(m => ({ default: m.BacktrackingPage })));
const DPPage = lazy(() => import('./features/dp/DPPage').then(m => ({ default: m.DPPage })));
const TriePage = lazy(() => import('./features/trie/TriePage').then(m => ({ default: m.TriePage })));
const OSModuleHub = lazy(() => import('./features/os/OSModuleHub').then(m => ({ default: m.OSModuleHub })));
const OSCategoriesHub = lazy(() => import('./features/os/OSCategoriesHub').then(m => ({ default: m.OSCategoriesHub })));
const LinuxCommandsPage = lazy(() => import('./features/os/commands/LinuxCommandsPage').then(m => ({ default: m.LinuxCommandsPage })));
const FileSystemPage = lazy(() => import('./features/os/filesystem/FileSystemPage').then(m => ({ default: m.FileSystemPage })));
const SignIn = lazy(() => import('./features/auth/SignIn').then(m => ({ default: m.SignIn })));
const SignUp = lazy(() => import('./features/auth/SignUp').then(m => ({ default: m.SignUp })));
const ForgotPassword = lazy(() => import('./features/auth/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./features/auth/ResetPassword').then(m => ({ default: m.ResetPassword })));
const PlansPage = lazy(() => import('./features/billing/PlansPage').then(m => ({ default: m.PlansPage })));


/**
 * Protected Route wrapper — redirects to login if not authenticated.
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen message="Checking session..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

const OwnerRoute: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen message="Verifying owner session..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.is_owner_session) return <Navigate to="/dashboard" replace />;
  return <OwnerControlCenter />;
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

type EntitlementsResponse = { features: Array<{ feature_key: string; label: string; has_access: boolean; is_premium: boolean; is_enabled: boolean }> };

const GatedRoute: React.FC<{ children: React.ReactNode; featureKey?: string }> = ({ children, featureKey }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { requireAuth } = useAuthPrompt();
  const navigate = useNavigate();
  const location = useLocation();
  const [accessState, setAccessState] = useState<'idle' | 'loading' | 'allowed' | 'denied' | 'error'>('idle');
  const [featureLabel, setFeatureLabel] = useState('This module');
  const [featureMessage, setFeatureMessage] = useState('This module requires premium access or an owner-granted entitlement.');
  const [checkedFeatureKey, setCheckedFeatureKey] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const destination = `${location.pathname}${location.search}`;
      requireAuth(() => navigate(destination, { replace: true }), 'Sign in to open this interactive module and save your progress.');
    }
  }, [isAuthenticated, isLoading, location.pathname, location.search, navigate, requireAuth]);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || !featureKey || user?.is_owner_session) {
      setAccessState('allowed');
      setCheckedFeatureKey(featureKey ?? '');
      return () => { cancelled = true; };
    }
    setAccessState('loading');
    setCheckedFeatureKey('');
    apiClient<EntitlementsResponse>('/api/entitlements/me', { requiresAuth: true })
      .then((response) => {
        if (cancelled) return;
        const feature = response.features.find((item) => item.feature_key === featureKey);
        if (!feature) {
          setCheckedFeatureKey(featureKey);
          setAccessState('error');
          return;
        }
        setFeatureLabel(feature.label);
        setFeatureMessage(!feature.is_enabled
          ? 'The owner has disabled this module for learner accounts. It will become available when the module is enabled again.'
          : 'This module requires premium access or an owner-granted entitlement. Contact the STEM Studio owner to request access.');
        setCheckedFeatureKey(featureKey);
        setAccessState(feature.has_access ? 'allowed' : 'denied');
      })
      .catch(() => { if (!cancelled) { setCheckedFeatureKey(featureKey); setAccessState('error'); } });
    return () => { cancelled = true; };
  }, [featureKey, isAuthenticated, user?.is_owner_session]);

  if (isLoading) return <LoadingScreen message="Checking session..." />;
  if (!isAuthenticated) return <DashboardHome />;
  if (featureKey && !user?.is_owner_session && (accessState === 'loading' || checkedFeatureKey !== featureKey)) return <LoadingScreen message="Checking module access..." />;
  if (featureKey && !user?.is_owner_session && accessState === 'error') return <section className="feature-access-state"><h1>Access could not be checked</h1><p>Reconnect and retry so STEM Studio can confirm your access to this module.</p><button type="button" onClick={() => window.location.reload()}>Retry</button></section>;
  if (featureKey && !user?.is_owner_session && accessState === 'denied') return <section className="feature-access-state"><span className="feature-access-kicker">Module access</span><h1>{featureLabel} is currently restricted</h1><p>{featureMessage}</p><button type="button" onClick={() => navigate(`/plans?feature=${encodeURIComponent(featureKey)}`)}>View monthly and yearly plans</button><button type="button" className="feature-access-secondary" onClick={() => navigate('/dashboard')}>Back to dashboard</button></section>;
  return <>{children}</>;
};

/** Send signed-in users straight into the interactive studio from the root URL. */
const RootRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen message="Checking session..." />;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <MarketingHome />;
};



/**
 * Main STEM Studio Dashboard Layout with Navbar & Sidebar & Octa AI Tutor
 */
const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(340);

  const pathSegment = location.pathname.split('/')[2] || '';

  const handleSelectModule = (moduleId: string) => {
    navigate(`/dashboard/${moduleId}`);
  };

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const openSidebar = () => setIsSidebarOpen(true);
  const closeSidebar = () => setIsSidebarOpen(false);

  // Determine active module and category from path.
  const isModulePage = MODULES.some(m => m.id === pathSegment);
  const isDsaCategory = DSA_CATEGORIES.some(c => c.id === pathSegment);
  const isOsCategory = OS_CATEGORIES.some(c => c.id === pathSegment);
  const isOSPage = pathSegment === 'os' || isOsCategory;

  const activeModuleId = isModulePage ? pathSegment : (isOSPage ? 'os' : (isDsaCategory ? 'dsa' : ''));
  const activeCategoryId = isDsaCategory || isOsCategory ? pathSegment : '';

  return (
    <div className="dashboard-shell">
      <Navbar onToggleSidebar={toggleSidebar} />
      <div className="dashboard-body">
        <TopicMenu
          activeModule={activeModuleId}
          activeCategory={activeCategoryId}
          onSelectModule={handleSelectModule}
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
          onOpen={openSidebar}
          sidebarWidth={sidebarWidth}
          onWidthChange={setSidebarWidth}
        />
        <main className="dashboard-main">
          <Suspense fallback={<LoadingScreen message="Loading module..." />}>
            <Routes>
          <Route index element={<><DashboardHome /><MarketingFooter /></>} />
              <Route path="owner/*" element={<OwnerRoute />} />
              <Route path="billing" element={<PlansPage />} />
              <Route path="dsa" element={<ModuleHub moduleId="dsa" />} />
              <Route path="complexity" element={<GatedRoute featureKey="complexity"><ComplexityPage /></GatedRoute>} />
              <Route path="sorting" element={<GatedRoute featureKey="sorting"><SortingPage /></GatedRoute>} />
              <Route path="stackQueue" element={<GatedRoute featureKey="stackQueue"><StackQueuePage /></GatedRoute>} />
              <Route path="linkedList" element={<GatedRoute featureKey="linkedList"><LinkedListPage /></GatedRoute>} />
              <Route path="bst" element={<GatedRoute featureKey="bst"><BSTPage /></GatedRoute>} />
              <Route path="binarySearch" element={<GatedRoute featureKey="binarySearch"><BinarySearchPage /></GatedRoute>} />
              <Route path="graph" element={<GatedRoute featureKey="graph"><GraphPage /></GatedRoute>} />
              <Route path="arrays" element={<GatedRoute featureKey="arrays"><ArraysPage /></GatedRoute>} />
              <Route path="strings" element={<GatedRoute featureKey="strings"><StringsPage /></GatedRoute>} />
              <Route path="recursion" element={<GatedRoute featureKey="recursion"><RecursionPage /></GatedRoute>} />
              <Route path="greedy" element={<GatedRoute featureKey="greedy"><GreedyPage /></GatedRoute>} />
              <Route path="hashMaps" element={<GatedRoute featureKey="hashMaps"><HashMapsPage /></GatedRoute>} />
              <Route path="backtracking" element={<GatedRoute featureKey="backtracking"><BacktrackingPage /></GatedRoute>} />
              <Route path="dp" element={<GatedRoute featureKey="dp"><DPPage /></GatedRoute>} />
              <Route path="trie" element={<GatedRoute featureKey="trie"><TriePage /></GatedRoute>} />

              {/* Operating System Module Routes */}
              <Route path="os" element={<OSModuleHub />} />
              <Route path="os/linux" element={<OSCategoriesHub />} />
              <Route path="os/commands" element={<GatedRoute featureKey="os-commands"><LinuxCommandsPage /></GatedRoute>} />
              <Route path="os/filesystem" element={<GatedRoute featureKey="os-filesystem"><FileSystemPage /></GatedRoute>} />
              <Route path="commands" element={<GatedRoute featureKey="os-commands"><LinuxCommandsPage /></GatedRoute>} />
              <Route path="filesystem" element={<GatedRoute featureKey="os-filesystem"><FileSystemPage /></GatedRoute>} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <ScrollToTop />
      <OctaTutor />
    </div>
  );

};

const AppContent = () => {
  const { isLoading } = useAuth();
  const location = useLocation();
  const [splashExited, setSplashExited] = useState(false);
  const handleSplashExited = useCallback(() => setSplashExited(true), []);

  useEffect(() => {
    // Keep the public landing page readable immediately; the studio splash is
    // reserved for routes that need the app session to initialize.
    if (location.pathname === '/') setSplashExited(true);
  }, [location.pathname]);

  return (
    <>
      <Suspense fallback={<LoadingScreen message="Loading..." />}>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/login" element={<GuestRoute><SignIn /></GuestRoute>} />
          <Route path="/signup" element={<GuestRoute><SignUp /></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
          <Route path="/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/dashboard/*" element={<DashboardLayout />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      {!splashExited && location.pathname !== '/' && (
        <BootSplash loading={isLoading} onExited={handleSplashExited} />
      )}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <MascotProvider>
          <TutorProvider>
            <Router>
              <AuthPromptProvider><AppContent /></AuthPromptProvider>
            </Router>
          </TutorProvider>
        </MascotProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}


export default App;
