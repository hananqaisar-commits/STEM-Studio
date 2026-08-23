import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Monitor, LogOut, User, Sparkles, Menu } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import './Layout.css';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

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

      <nav className="navbar-center">
        <Link
          to="/dashboard/sorting"
          className={`nav-tab ${location.pathname.includes('/sorting') ? 'active' : ''}`}
        >
          Sorting
        </Link>
        <Link
          to="/dashboard/stackQueue"
          className={`nav-tab ${location.pathname.includes('/stackQueue') ? 'active' : ''}`}
        >
          Stack & Queue
        </Link>
        <Link
          to="/dashboard/linkedList"
          className={`nav-tab ${location.pathname.includes('/linkedList') ? 'active' : ''}`}
        >
          Linked List
        </Link>
        <Link
          to="/dashboard/bst"
          className={`nav-tab ${location.pathname.includes('/bst') ? 'active' : ''}`}
        >
          BST
        </Link>
        <Link
          to="/dashboard/binarySearch"
          className={`nav-tab ${location.pathname.includes('/binarySearch') ? 'active' : ''}`}
        >
          Binary Search
        </Link>
        <Link
          to="/dashboard/graph"
          className={`nav-tab ${location.pathname.includes('/graph') ? 'active' : ''}`}
        >
          Graphs
        </Link>
      </nav>

      <div className="navbar-right">
        <button
          onClick={toggleTheme}
          className="navbar-icon-btn"
          title={`Theme: ${theme}`}
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? <Sun size={18} /> : theme === 'dark' ? <Moon size={18} /> : <Monitor size={18} />}
        </button>

        <div className="user-dropdown-container">
          <button
            className="user-profile-btn"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="user-avatar">
              <User size={16} />
            </div>
            <span className="user-name">{user?.username || 'Account'}</span>
          </button>

          {showDropdown && (
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
