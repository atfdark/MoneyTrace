import React from 'react';
import { Link } from 'react-router-dom';

export const Unauthorized: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-error/20 text-error flex items-center justify-center mx-auto">
        <span className="material-symbols-outlined text-[36px]">lock</span>
      </div>
      <h1 className="text-2xl font-bold text-on-surface">Access Restricted</h1>
      <p className="text-sm text-on-surface-variant max-w-md">
        You do not have investigator or administrator privileges to access this forensic intelligence module.
      </p>
      <Link
        to="/dashboard"
        className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-xs hover:bg-primary/90 transition-all"
      >
        Return to Dashboard
      </Link>
    </div>
  );
};

export default Unauthorized;
