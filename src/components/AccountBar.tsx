import React, { useEffect, useState } from 'react';
import { LogIn, LogOut, FolderOpen, Save, Trash2, X, Loader2, User, Pencil, Check, Upload } from 'lucide-react';
import type { ETFAsset, SimulationParams } from '../types';
import { useAuth } from '../auth/AuthContext';
import {
  createPlan,
  deletePlan,
  listPlans,
  planFingerprint,
  renamePlan,
  updatePlan,
  type SavedPlan,
} from '../lib/plans';
import AuthModal from './AuthModal';

interface AccountBarProps {
  params: SimulationParams;
  etfs: ETFAsset[];
  onLoadPlan: (plan: SavedPlan) => void;
  authOpen: boolean;
  onAuthOpenChange: (open: boolean) => void;
}

const dateFmt = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

const sameName = (a: string, b: string) => a.trim().toLocaleLowerCase('es') === b.trim().toLocaleLowerCase('es');

export default function AccountBar({ params, etfs, onLoadPlan, authOpen, onAuthOpenChange }: AccountBarProps) {
  const auth = useAuth();
  const [plansOpen, setPlansOpen] = useState(false);
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.user) {
      setPlans([]);
      setActivePlanId(null);
      return;
    }
    listPlans().then(setPlans).catch((err) => setError(err.message));
  }, [auth.user]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  if (!auth.enabled) return null;

  const activePlan = plans.find((p) => p.id === activePlanId) ?? null;
  const currentFingerprint = planFingerprint(params, etfs);
  const isDirty = activePlan ? planFingerprint(activePlan.params, activePlan.etfs) !== currentFingerprint : false;

  const replacePlan = (updated: SavedPlan) =>
    setPlans((prev) => [updated, ...prev.filter((p) => p.id !== updated.id)]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar');
    } finally {
      setBusy(false);
    }
  };

  const overwrite = (plan: SavedPlan) =>
    run(async () => {
      const updated = await updatePlan(plan.id, params, etfs);
      replacePlan(updated);
      setActivePlanId(updated.id);
      setToast(`Cambios guardados en "${updated.name}"`);
    });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const existing = plans.find((p) => sameName(p.name, name));
    if (existing) {
      if (!window.confirm(`Ya tienes un plan llamado "${existing.name}". ¿Sobrescribirlo con la configuración actual?`)) return;
      setNewName('');
      overwrite(existing);
      return;
    }
    run(async () => {
      const created = await createPlan(name, params, etfs);
      setPlans((prev) => [created, ...prev]);
      setActivePlanId(created.id);
      setNewName('');
      setToast(`Plan "${name}" guardado`);
    });
  };

  const handleOverwrite = (plan: SavedPlan) => {
    if (plan.id !== activePlanId && !window.confirm(`¿Sustituir "${plan.name}" por la configuración que tienes ahora en pantalla?`)) return;
    overwrite(plan);
  };

  const startRename = (plan: SavedPlan) => {
    setRenamingId(plan.id);
    setRenameValue(plan.name);
  };

  const submitRename = (plan: SavedPlan) => {
    const name = renameValue.trim();
    if (!name || name === plan.name) {
      setRenamingId(null);
      return;
    }
    if (plans.some((p) => p.id !== plan.id && sameName(p.name, name))) {
      setError(`Ya existe otro plan llamado "${name}"`);
      return;
    }
    run(async () => {
      const updated = await renamePlan(plan.id, name);
      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setRenamingId(null);
    });
  };

  const handleLoad = (plan: SavedPlan) => {
    if (isDirty && activePlan && plan.id !== activePlan.id) {
      if (!window.confirm(`"${activePlan.name}" tiene cambios sin guardar. ¿Cargar "${plan.name}" igualmente?`)) return;
    }
    onLoadPlan(plan);
    setActivePlanId(plan.id);
    setPlansOpen(false);
    setToast(`Plan "${plan.name}" cargado`);
  };

  const handleDelete = (plan: SavedPlan) => {
    if (!window.confirm(`¿Eliminar el plan "${plan.name}"?`)) return;
    run(async () => {
      await deletePlan(plan.id);
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
      if (activePlanId === plan.id) setActivePlanId(null);
    });
  };

  const iconBtn = 'w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 cursor-pointer disabled:opacity-40';

  return (
    <>
      <div className="flex items-center justify-end gap-2 flex-wrap">
        {toast && (
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            {toast}
          </span>
        )}

        {auth.user ? (
          <>
            {activePlan && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 max-w-[16rem]">
                <span className="truncate">
                  Plan: <span className="font-black text-slate-900">{activePlan.name}</span>
                </span>
                {isDirty ? (
                  <span className="shrink-0 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                    sin guardar
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                    guardado
                  </span>
                )}
              </span>
            )}
            {activePlan && isDirty && (
              <button
                onClick={() => overwrite(activePlan)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-2xs cursor-pointer disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Guardar cambios
              </button>
            )}
            <button
              onClick={() => setPlansOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold shadow-2xs hover:border-orange-300 cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-orange-600" />
              Mis planes
              <span className="text-[11px] px-1.5 rounded-full bg-slate-100 text-slate-700">{plans.length}</span>
            </button>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-slate-600 max-w-[14rem] truncate">
              <User className="w-3.5 h-3.5" />
              {auth.user.email}
            </span>
            <button
              onClick={() => auth.signOut()}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-rose-600 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <button
            onClick={() => onAuthOpenChange(true)}
            disabled={auth.loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold shadow-2xs hover:border-orange-300 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-orange-600" />
            Iniciar sesión
          </button>
        )}
      </div>

      <AuthModal isOpen={authOpen} onClose={() => onAuthOpenChange(false)} />

      {plansOpen && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPlansOpen(false);
          }}
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900">Mis planes</h2>
              <button
                aria-label="Cerrar"
                onClick={() => setPlansOpen(false)}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700" htmlFor="new-plan-name">
                Guardar lo que tienes en pantalla como plan nuevo
              </label>
              <div className="flex gap-2">
                <input
                  id="new-plan-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={120}
                  placeholder="Ej. Jubilación 20 años"
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 focus:border-orange-400 outline-none text-base sm:text-sm"
                />
                <button
                  type="submit"
                  disabled={busy || !newName.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Guardar
                </button>
              </div>
            </form>

            {error && <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">{error}</p>}

            <ul className="space-y-2 overflow-y-auto">
              {plans.length === 0 && (
                <li className="text-xs text-slate-600 text-center py-6">Aún no tienes planes guardados.</li>
              )}
              {plans.map((plan) => {
                const isActive = plan.id === activePlanId;
                const isRenaming = plan.id === renamingId;
                return (
                  <li
                    key={plan.id}
                    className={`flex items-center gap-1 p-2.5 rounded-xl border ${
                      isActive ? 'border-orange-400 bg-orange-50/40' : 'border-slate-200'
                    }`}
                  >
                    {isRenaming ? (
                      <form
                        className="flex-1 min-w-0 flex items-center gap-1"
                        onSubmit={(e) => {
                          e.preventDefault();
                          submitRename(plan);
                        }}
                      >
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Escape' && setRenamingId(null)}
                          maxLength={120}
                          aria-label="Nuevo nombre"
                          className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-orange-300 outline-none text-base sm:text-sm"
                        />
                        <button type="submit" aria-label="Guardar nombre" disabled={busy} className={`${iconBtn} hover:text-emerald-700 hover:bg-emerald-50`}>
                          <Check className="w-4 h-4" />
                        </button>
                        <button type="button" aria-label="Cancelar" onClick={() => setRenamingId(null)} className={`${iconBtn} hover:bg-slate-100`}>
                          <X className="w-4 h-4" />
                        </button>
                      </form>
                    ) : (
                      <>
                        <button onClick={() => handleLoad(plan)} className="flex-1 min-w-0 text-left cursor-pointer px-1" title="Cargar este plan">
                          <div className="text-sm font-bold text-slate-900 truncate">
                            {plan.name}
                            {isActive && <span className="ml-1.5 text-[11px] font-bold text-orange-700">(abierto)</span>}
                          </div>
                          <div className="text-xs text-slate-600">
                            {plan.etfs.length} ETFs · {plan.params.years} años · {dateFmt.format(new Date(plan.updated_at))}
                          </div>
                        </button>
                        <button
                          onClick={() => handleOverwrite(plan)}
                          disabled={busy || (isActive && !isDirty)}
                          aria-label={`Guardar lo actual en ${plan.name}`}
                          title="Sobrescribir con lo que tienes en pantalla"
                          className={`${iconBtn} hover:text-orange-700 hover:bg-orange-50`}
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => startRename(plan)}
                          aria-label={`Renombrar ${plan.name}`}
                          title="Renombrar"
                          className={`${iconBtn} hover:text-slate-900 hover:bg-slate-100`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(plan)}
                          aria-label={`Eliminar ${plan.name}`}
                          title="Eliminar"
                          className={`${iconBtn} hover:text-rose-600 hover:bg-rose-50`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Pulsa un plan para cargarlo. <Upload className="inline w-3 h-3" /> guarda en él lo que tienes en pantalla,{' '}
              <Pencil className="inline w-3 h-3" /> lo renombra.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
