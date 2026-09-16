import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPromptProvider, useAuthPrompt } from './contexts/AuthPromptContext';
import { MascotProvider } from './components/mascot';
import { SignIn } from './features/auth/SignIn';
import { SignUp } from './features/auth/SignUp';
import { ForgotPassword } from './features/auth/ForgotPassword';
import { ResetPassword } from './features/auth/ResetPassword';
import { LoadingScreen } from './components/common/LoadingScreen';
import { BootSplash } from './components/common/BootSplash';
import { ScrollToTop } from './components/common/ScrollToTop';
import { Navbar } from './components/layout/Navbar';
import { TopicMenu } from './components/layout/TopicMenu';
import { DSAHub } from './features/hub/DSAHub';
import { ModuleHub } from './features/hub/ModuleHub';
import { MODULES, DSA_CATEGORIES, OS_CATEGORIES } from './data/categories';
import { ComplexityPage } from './features/complexity/ComplexityPage';
import { SortingPage } from './features/sorting/SortingPage';
import { BSTPage } from './features/bst/BSTPage';
import { StackQueuePage } from './features/stackQueue/StackQueuePage';
import { LinkedListPage } from './features/linkedList/LinkedListPage';
import { BinarySearchPage } from './features/binarySearch/BinarySearchPage';
import { GraphPage } from './features/graph/GraphPage';
import { ArraysPage } from './features/arrays/ArraysPage';
import { StringsPage } from './features/strings/StringsPage';
import { RecursionPage } from './features/recursion/RecursionPage';
import { GreedyPage } from './features/greedy/GreedyPage';
import { HashMapsPage } from './features/hashMaps/HashMapsPage';
import { BacktrackingPage } from './features/backtracking/BacktrackingPage';
import { DPPage } from './features/dp/DPPage';
import { TriePage } from './features/trie/TriePage';
import { OSModuleHub } from './features/os/OSModuleHub';
import { OSCategoriesHub } from './features/os/OSCategoriesHub';
import { LinuxCommandsPage } from './features/os/commands/LinuxCommandsPage';
import { FileSystemPage } from './features/os/filesystem/FileSystemPage';

import { TutorProvider } from './contexts/TutorContext';
import { OctaTutor } from './components/tutor/OctaTutor';
import { NotFoundPage } from './features/NotFoundPage';


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
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<GuestRoute><SignIn /></GuestRoute>} />
        <Route path="/signup" element={<GuestRoute><SignUp /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
        <Route path="/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />
        <Route path="/dashboard/*" element={<DashboardLayout />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
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
