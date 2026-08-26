import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Droplets, LogOut, User, Sparkles, Menu, ChevronDown, Check, Palette, ChevronRight } from 'lucide-react';
import { useTheme, type Theme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getCategoryById, MODULES } from '../../data/categories';
import './Layout.css';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setShowThemeDropdown(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Derive breadcrumb from current path
  const pathSegment = location.pathname.split('/')[2] || '';
  const currentCategory = pathSegment ? getCategoryById(pathSegment) : null;
  const currentModule = pathSegment ? MODULES.find(m => m.id === pathSegment) : null;

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'grayscale-light', label: 'Grayscale Light', icon: <Sun size={14} /> },
    { value: 'warm-light', label: 'Warm Light', icon: <Sun size={14} /> },
    { value: 'dark', label: 'Dark', icon: <Moon size={14} /> },
    { value: 'warm-neutral', label: 'Warm Neutral', icon: <Sun size={14} /> },
    { value: 'blue', label: 'Blue', icon: <Droplets size={14} /> },
  ];

  const isOnDashboard = location.pathname === '/dashboard';

  return (
    <header className="app-navbar">
      <div className="navbar-left">
        {/* Hamburger — visible only on mobile/tablet via CSS */}
        <button
          className="hamburger-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>

        <Link to="/dashboard" className="navbar-brand">
          <div className="brand-logo-glow">
            <Sparkles size={22} className="brand-icon" />
          </div>
          <span className="brand-title">STEM <span className="brand-accent">Studio</span></span>
        </Link>
      </div>

      {/* Breadcrumb / section links */}
      <nav className="navbar-center">
        {isOnDashboard ? (
          <div className="nav-section-links">
            <a href="#hero" className="nav-section-link">Home</a>
            <a href="#features" className="nav-section-link">Features</a>
            <a href="#reviews" className="nav-section-link">Reviews</a>
            <a href="#faqs" className="nav-section-link">FAQs</a>
          </div>
        ) : currentModule ? (
          <div className="nav-breadcrumb">
            <Link to="/dashboard" className="nav-crumb-link">Dashboard</Link>
            <ChevronRight size={14} className="nav-crumb-sep" />
            <span className="nav-crumb-current">{currentModule.name}</span>
          </div>
        ) : currentCategory ? (
          <div className="nav-breadcrumb">
            <Link to="/dashboard" className="nav-crumb-link">Dashboard</Link>
            <ChevronRight size={14} className="nav-crumb-sep" />
            <Link to="/dashboard/dsa" className="nav-crumb-link">DSA</Link>
            <ChevronRight size={14} className="nav-crumb-sep" />
            <span className="nav-crumb-current">{currentCategory.name}</span>
          </div>
        ) : (
          <span className="nav-crumb-current">Dashboard</span>
        )}
      </nav>

      <div className="navbar-right">
        <div className="theme-dropdown-container" ref={themeDropdownRef}>
          <button
            className="theme-selector-btn"
            onClick={() => setShowThemeDropdown(!showThemeDropdown)}
            aria-label="Select Appearance"
          >
            <Palette size={15} aria-hidden="true" />
            <span className="theme-selector-label">Appearance</span>
            <ChevronDown size={14} />
          </button>

          {showThemeDropdown && (
            <div className="theme-dropdown-menu animate-fade-in">
              <div className="dropdown-header">Appearance</div>
              <div className="dropdown-divider" />
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  className={`dropdown-item theme-option-btn ${theme === option.value ? 'active' : ''}`}
                  onClick={() => {
                    setTheme(option.value);
                    setShowThemeDropdown(false);
                  }}
                >
                  <span className="theme-option-icon">{option.icon}</span>
                  <span className="theme-option-text">{option.label}</span>
                  {theme === option.value && <Check size={14} className="theme-active-icon" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="user-dropdown-container" ref={userDropdownRef}>
          <button
            className="user-profile-btn"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
          >
            <div className="user-avatar">
              <User size={16} />
            </div>
            <span className="user-name">{user?.username || 'Account'}</span>
          </button>

          {showUserDropdown && (
            <div className="user-dropdown-menu animate-fade-in">
              <div className="dropdown-user-info">
                <span className="dropdown-username">{user?.username}</span>
                <span className="dropdown-email">{user?.email}</span>
              </div>
              <div className="dropdown-divider" />
              <button onClick={logout} className="dropdown-item logout-btn">
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
