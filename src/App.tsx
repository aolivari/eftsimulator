import { ETFSimulator } from './app/ETFSimulator';
import { AuthProvider } from './features/cuentas';

export default function App() {
  return (
    <AuthProvider>
      <ETFSimulator />
    </AuthProvider>
  );
}
