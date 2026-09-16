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

// Lazy-loaded page components for code-splitting
const DSAHub = lazy(() => import('./features/hub/DSAHub').then(m => ({ default: m.DSAHub })));
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

const GatedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { requireAuth } = useAuthPrompt();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const destination = `${location.pathname}${location.search}`;
      requireAuth(() => navigate(destination, { replace: true }), 'Sign in to open this interactive module and save your progress.');
    }
  }, [isAuthenticated, isLoading, location.pathname, location.search, navigate, requireAuth]);

  if (isLoading) return <LoadingScreen message="Checking session..." />;
  return isAuthenticated ? <>{children}</> : <DSAHub />;
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
              <Route index element={<DSAHub />} />
              <Route path="dsa" element={<ModuleHub moduleId="dsa" />} />
              <Route path="complexity" element={<GatedRoute><ComplexityPage /></GatedRoute>} />
              <Route path="sorting" element={<GatedRoute><SortingPage /></GatedRoute>} />
              <Route path="stackQueue" element={<GatedRoute><StackQueuePage /></GatedRoute>} />
              <Route path="linkedList" element={<GatedRoute><LinkedListPage /></GatedRoute>} />
              <Route path="bst" element={<GatedRoute><BSTPage /></GatedRoute>} />
              <Route path="binarySearch" element={<GatedRoute><BinarySearchPage /></GatedRoute>} />
              <Route path="graph" element={<GatedRoute><GraphPage /></GatedRoute>} />
              <Route path="arrays" element={<GatedRoute><ArraysPage /></GatedRoute>} />
              <Route path="strings" element={<GatedRoute><StringsPage /></GatedRoute>} />
              <Route path="recursion" element={<GatedRoute><RecursionPage /></GatedRoute>} />
              <Route path="greedy" element={<GatedRoute><GreedyPage /></GatedRoute>} />
              <Route path="hashMaps" element={<GatedRoute><HashMapsPage /></GatedRoute>} />
              <Route path="backtracking" element={<GatedRoute><BacktrackingPage /></GatedRoute>} />
              <Route path="dp" element={<GatedRoute><DPPage /></GatedRoute>} />
              <Route path="trie" element={<GatedRoute><TriePage /></GatedRoute>} />

              {/* Operating System Module Routes */}
              <Route path="os" element={<OSModuleHub />} />
              <Route path="os/linux" element={<OSCategoriesHub />} />
              <Route path="os/commands" element={<GatedRoute><LinuxCommandsPage /></GatedRoute>} />
              <Route path="os/filesystem" element={<GatedRoute><FileSystemPage /></GatedRoute>} />
              <Route path="commands" element={<GatedRoute><LinuxCommandsPage /></GatedRoute>} />
              <Route path="filesystem" element={<GatedRoute><FileSystemPage /></GatedRoute>} />
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
  const [splashExited, setSplashExited] = useState(false);
  const handleSplashExited = useCallback(() => setSplashExited(true), []);

  return (
    <>
      <Suspense fallback={<LoadingScreen message="Loading..." />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<GuestRoute><SignIn /></GuestRoute>} />
          <Route path="/signup" element={<GuestRoute><SignUp /></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
          <Route path="/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />
          <Route path="/dashboard/*" element={<DashboardLayout />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      {!splashExited && (
        <BootSplash loading={isLoading} onExited={handleSplashExited} />
      )}
    </>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MascotProvider>
          <TutorProvider>
            <Router>
              <AuthPromptProvider><AppContent /></AuthPromptProvider>
            </Router>
          </TutorProvider>
        </MascotProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}


export default App;
