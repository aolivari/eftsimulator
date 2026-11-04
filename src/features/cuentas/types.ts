import type { ETFAsset, SavedPlan, SimulationParams } from '../../types';
import type { Session, User } from '../../shared/lib';

export type { SavedPlan };

export interface AuthContextValue {
  enabled: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export interface AccountBarProps {
  params: SimulationParams;
  etfs: ETFAsset[];
  onLoadPlan: (plan: SavedPlan) => void;
  authOpen: boolean;
  onAuthOpenChange: (open: boolean) => void;
}

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}
