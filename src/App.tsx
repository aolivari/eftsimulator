import React from 'react';
import ETFSimulator from './components/ETFSimulator';
import { AuthProvider } from './auth/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <ETFSimulator />
    </AuthProvider>
  );
}
