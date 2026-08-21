import React from 'react';
import { AuthPortal } from '../AuthPortal';

export const CustomerLogin: React.FC = () => {
  return <AuthPortal initialPortal="customer" initialTab="signin" />;
};

export default CustomerLogin;
