import React from 'react';
import { Link } from 'react-router-dom';
import { SEOHead } from '../components/common/SEOHead';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white p-6">
      <SEOHead 
        title="Page Not Found | STEM Studio" 
        noIndex={true} 
      />
      
      <div className="text-center max-w-lg">
        <h1 className="text-6xl font-bold text-indigo-500 mb-4">404</h1>
        <h2 className="text-3xl font-semibold mb-6">Page Not Found</h2>
        <p className="text-neutral-400 mb-8 text-lg">
          The page you are looking for doesn't exist or has been moved. Let's get you back to learning on STEM Studio.
        </p>
        
        <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 justify-center mb-12">
          <Link 
            to="/dashboard" 
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors"
          >
            Go to Homepage
          </Link>
          <Link 
            to="/dashboard/dsa" 
            className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg font-medium transition-colors border border-neutral-700"
          >
            Explore DSA
          </Link>
        </div>
        
        <div className="text-left bg-neutral-800/50 p-6 rounded-xl border border-neutral-700/50">
          <h3 className="text-xl font-medium mb-4">Popular Topics</h3>
          <ul className="space-y-2">
            <li>
              <Link to="/dashboard/sorting" className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center">
                <span className="mr-2">→</span> Sorting Algorithms
              </Link>
            </li>
            <li>
              <Link to="/dashboard/graph" className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center">
                <span className="mr-2">→</span> Graph Algorithms
              </Link>
            </li>
            <li>
              <Link to="/dashboard/dp" className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center">
                <span className="mr-2">→</span> Dynamic Programming
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
