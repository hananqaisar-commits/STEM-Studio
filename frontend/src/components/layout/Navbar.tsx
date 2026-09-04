import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'motion/react';
import {
  Home, Bell, Settings, Moon, Sun, User, LogOut, Code2, Layers, Menu
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { NavbarGlobalSearch } from './NavbarGlobalSearch';
import { DSA_CATEGORIES } from '../../data/categories';
import { SettingsModal } from './SettingsModal';
import '../mascot/Mascot.css';
import './Layout.css';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string>('home');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Sync activeTab with current route
  useEffect(() => {
    if (location.pathname === '/dashboard') {
      setActiveTab('home');
    } else if (location.pathname.includes('/dashboard/dsa')) {
      setActiveTab('dsa');
    } else if (location.pathname.startsWith('/dashboard/')) {
      setActiveTab('visualizer');
    }
  }, [location.pathname]);

  // Close user dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId === 'home') {
      navigate('/dashboard');
    } else if (tabId === 'dsa') {
      navigate('/dashboard/dsa');
    } else if (tabId === 'settings') {
      setShowSettingsModal(true);
    } else if (tabId === 'theme') {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    }
  };

  return (
    <LazyMotion features={domAnimation}>
      <header className="expandable-navbar-wrapper">
        <div className="expandable-navbar-pill">
          {/* Mobile Menu Toggle */}
          <button
            className="expandable-tab-btn mobile-menu-btn"
            onClick={onToggleSidebar}
            aria-label="Toggle Navigation Sidebar"
          >
            <Menu size={18} />
          </button>

          {/* Brand Logo & Title */}
          <Link to="/dashboard" className="navbar-brand-pill">
            <span className="brand-pill-title">
              STEM <span className="brand-accent-text">Studio</span>
            </span>
          </Link>

          <div className="navbar-pill-divider" />

          {/* Navigation Items */}
          <div className="navbar-nav-group">
            {/* Home Tab */}
            <m.button
              layout
              onClick={() => handleTabClick('home')}
              className={`expandable-tab-btn ${activeTab === 'home' ? 'active' : ''}`}
            >
              <Home size={18} className="tab-icon" />
              <AnimatePresence initial={false}>
                {activeTab === 'home' && (
                  <m.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="tab-label-text"
                  >
                    Home
                  </m.span>
                )}
              </AnimatePresence>
            </m.button>

            {/* DSA Modules Tab */}
            <m.button
              layout
              onClick={() => handleTabClick('dsa')}
              className={`expandable-tab-btn ${activeTab === 'dsa' ? 'active' : ''}`}
            >
              <Layers size={18} className="tab-icon" />
              <AnimatePresence initial={false}>
                {activeTab === 'dsa' && (
                  <m.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="tab-label-text"
                  >
                    DSA Modules
                  </m.span>
                )}
              </AnimatePresence>
            </m.button>

            {/* Visualizer Tab */}
            <m.button
              layout
              onClick={() => handleTabClick('visualizer')}
              className={`expandable-tab-btn ${activeTab === 'visualizer' ? 'active' : ''}`}
            >
              <Code2 size={18} className="tab-icon" />
              <AnimatePresence initial={false}>
                {activeTab === 'visualizer' && (
                  <m.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="tab-label-text"
                  >
                    Visualizer
                  </m.span>
                )}
              </AnimatePresence>
            </m.button>
          </div>

          <div className="navbar-pill-divider" />

          {/* Global Universal Navbar Search Bar */}
          <div className="navbar-global-search flex items-center px-1">
            <NavbarGlobalSearch />
          </div>

          <div className="navbar-pill-divider" />

          {/* Tools & Action Group */}
          <div className="navbar-nav-group">
            {/* Notifications Tab */}
            <m.button
              layout
              onClick={() => handleTabClick('notifications')}
              className={`expandable-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            >
              <Bell size={18} className="tab-icon" />
              <AnimatePresence initial={false}>
                {activeTab === 'notifications' && (
                  <m.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="tab-label-text"
                  >
                    Notifications
                  </m.span>
                )}
              </AnimatePresence>
            </m.button>

            {/* Settings Tab */}
            <m.button
              layout
              onClick={() => handleTabClick('settings')}
              className={`expandable-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
              title="Settings"
            >
              <Settings size={18} className="tab-icon" />
              <AnimatePresence initial={false}>
                {activeTab === 'settings' && (
                  <m.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="tab-label-text"
                  >
                    Settings
                  </m.span>
                )}
              </AnimatePresence>
            </m.button>

            {/* Theme Toggle Tab */}
            <m.button
              layout
              onClick={() => handleTabClick('theme')}
              className={`expandable-tab-btn ${activeTab === 'theme' ? 'active' : ''}`}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Moon size={18} className="tab-icon" /> : <Sun size={18} className="tab-icon" />}
              <AnimatePresence initial={false}>
                {activeTab === 'theme' && (
                  <m.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="tab-label-text"
                  >
                    {theme === 'dark' ? 'Dark' : 'Light'}
                  </m.span>
                )}
              </AnimatePresence>
            </m.button>
          </div>

          <div className="navbar-pill-divider" />

          {/* User Account Dropdown */}
          <div className="user-pill-container" ref={userDropdownRef}>
            <m.button
              layout
              onClick={() => {
                setActiveTab('user');
                setShowUserDropdown(!showUserDropdown);
              }}
              className={`expandable-tab-btn ${activeTab === 'user' || showUserDropdown ? 'active' : ''}`}
            >
              <User size={18} className="tab-icon" />
              <AnimatePresence initial={false}>
                {(activeTab === 'user' || showUserDropdown) && (
                  <m.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="tab-label-text"
                  >
                    {user?.username || 'Account'}
                  </m.span>
                )}
              </AnimatePresence>
            </m.button>

            {showUserDropdown && (
              <div className="user-dropdown-menu animate-fade-in">
                <div className="dropdown-user-info">
                  <span className="dropdown-username">{user?.username}</span>
                  <span className="dropdown-email">{user?.email}</span>
                </div>
                <div className="dropdown-divider" />
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    setShowSettingsModal(true);
                  }}
                  className="dropdown-item"
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </button>
                <button onClick={logout} className="dropdown-item logout-btn">
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Navbar Settings Modal */}
      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </LazyMotion>
  );
};
