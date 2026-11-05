import React, { createContext, useContext } from 'react';
import { X } from 'lucide-react';

interface ModalContextValue {
  onClose: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export interface ModalRootProps {
  isOpen: boolean;
  onClose: () => void;
  maxWidthClass?: string;
  children: React.ReactNode;
}

function Root({
  isOpen,
  onClose,
  maxWidthClass = 'max-w-md',
  children,
}: ModalRootProps) {
  if (!isOpen) return null;

  return (
    <ModalContext.Provider value={{ onClose }}>
      <div
        className="fixed inset-0 z-[60] bg-slate-900/50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className={`w-full ${maxWidthClass} bg-white rounded-lg border border-slate-200 shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col`}
        >
          {children}
        </div>
      </div>
    </ModalContext.Provider>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  const ctx = useContext(ModalContext);

  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-semibold text-slate-900">{children}</h2>
      {ctx && (
        <button
          type="button"
          aria-label="Cerrar"
          onClick={ctx.onClose}
          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function Actions({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex items-center justify-end gap-2 pt-2 ${className}`.trim()}>
      {children}
    </div>
  );
}

export const Modal = {
  Root,
  Title,
  Actions,
};
