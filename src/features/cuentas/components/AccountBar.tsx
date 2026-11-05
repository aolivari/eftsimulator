import React, { useEffect, useState } from 'react';
import {
  LogIn,
  LogOut,
  FolderOpen,
  Save,
  Trash2,
  X,
  Loader2,
  User,
  Pencil,
  Check,
  Upload,
} from 'lucide-react';
import { Badge, Button, Input, Modal } from '../../../shared/ui';
import { formatDateShort } from '../../../shared/utils';
import { useAuth } from '../hooks/useAuth';
import {
  createPlan,
  deletePlan,
  listPlans,
  planFingerprint,
  renamePlan,
  updatePlan,
} from '../services/plansService';
import type { AccountBarProps, SavedPlan } from '../types';
import { deleteAccount } from '../services/accountService';
import AuthModal from './AuthModal';

const sameName = (a: string, b: string) =>
  a.trim().toLocaleLowerCase('es') === b.trim().toLocaleLowerCase('es');

export default function AccountBar({
  params,
  etfs,
  onLoadPlan,
  authOpen,
  onAuthOpenChange,
}: AccountBarProps) {
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
    listPlans()
      .then(setPlans)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Error al cargar planes'));
  }, [auth.user]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  if (!auth.enabled) return null;

  const activePlan = plans.find((p) => p.id === activePlanId) ?? null;
  const currentFingerprint = planFingerprint(params, etfs);
  const isDirty = activePlan
    ? planFingerprint(activePlan.params, activePlan.etfs) !== currentFingerprint
    : false;

  const replacePlan = (updated: SavedPlan) =>
    setPlans((prev) => [updated, ...prev.filter((p) => p.id !== updated.id)]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = () => {
    const token = auth.session?.access_token;
    if (!token) return;
    if (
      !window.confirm(
        'Vas a darte de baja. Se borrarán tu cuenta y todos tus planes guardados. Esta acción no se puede deshacer. ¿Continuar?'
      )
    ) {
      return;
    }
    if (!window.confirm('Última confirmación: ¿de verdad quieres borrar tu cuenta?')) return;
    run(async () => {
      await deleteAccount(token);
      setPlans([]);
      setActivePlanId(null);
      setToast('Tu cuenta se ha dado de baja');
    });
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
      if (
        !window.confirm(
          `Ya tienes un plan llamado "${existing.name}". ¿Sobrescribirlo con la configuración actual?`
        )
      ) {
        return;
      }
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
    if (
      plan.id !== activePlanId &&
      !window.confirm(`¿Sustituir "${plan.name}" por la configuración que tienes ahora en pantalla?`)
    ) {
      return;
    }
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
      if (
        !window.confirm(`"${activePlan.name}" tiene cambios sin guardar. ¿Cargar "${plan.name}" igualmente?`)
      ) {
        return;
      }
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

  const iconBtn =
    'w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 cursor-pointer disabled:opacity-40';

  return (
    <>
      <div className="flex items-center justify-end gap-2 flex-wrap">
        {toast && <Badge tone="emerald">{toast}</Badge>}

        {auth.user ? (
          <>
            {activePlan && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 max-w-[16rem]">
                <span className="truncate">
                  Plan: <span className="font-semibold text-slate-900">{activePlan.name}</span>
                </span>
                {isDirty ? (
                  <Badge tone="amber" className="shrink-0">
                    sin guardar
                  </Badge>
                ) : (
                  <Badge tone="emerald" className="shrink-0">
                    guardado
                  </Badge>
                )}
              </span>
            )}
            {activePlan && isDirty && (
              <Button onClick={() => overwrite(activePlan)} disabled={busy}>
                {busy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Guardar cambios
              </Button>
            )}
            <Button variant="secondary" onClick={() => setPlansOpen(true)}>
              <FolderOpen className="w-3.5 h-3.5 text-orange-600" />
              Mis planes
              <span className="text-[11px] px-1.5 rounded-full bg-slate-100 text-slate-700">
                {plans.length}
              </span>
            </Button>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-slate-600 max-w-[14rem] truncate">
              <User className="w-3.5 h-3.5" />
              {auth.user.email}
            </span>
            <button
              type="button"
              onClick={() => auth.signOut()}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-rose-600 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={busy}
              aria-label="Dar de baja la cuenta"
              title="Dar de baja la cuenta y borrar todos mis planes"
              className="h-8 px-2 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-500 hover:text-rose-600 cursor-pointer disabled:opacity-50"
            >
              Darme de baja
            </button>
          </>
        ) : (
          <Button
            variant="secondary"
            onClick={() => onAuthOpenChange(true)}
            disabled={auth.loading}
          >
            <LogIn className="w-3.5 h-3.5 text-orange-600" />
            Iniciar sesión
          </Button>
        )}
      </div>

      <AuthModal isOpen={authOpen} onClose={() => onAuthOpenChange(false)} />

      <Modal.Root isOpen={plansOpen} onClose={() => setPlansOpen(false)} maxWidthClass="max-w-md">
        <Modal.Title>Mis planes</Modal.Title>

        <form onSubmit={handleCreate} className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700" htmlFor="new-plan-name">
            Guardar lo que tienes en pantalla como plan nuevo
          </label>
          <div className="flex gap-2">
            <Input
              id="new-plan-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={120}
              placeholder="Ej. Jubilación 20 años"
              className="flex-1 min-w-0"
            />
            <Button type="submit" disabled={busy || !newName.trim()} className="py-2">
              {busy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Guardar
            </Button>
          </div>
        </form>

        {error && (
          <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
            {error}
          </p>
        )}

        <ul className="space-y-2 overflow-y-auto">
          {plans.length === 0 && (
            <li className="text-xs text-slate-600 text-center py-6">
              Aún no tienes planes guardados.
            </li>
          )}
          {plans.map((plan) => {
            const isActive = plan.id === activePlanId;
            const isRenaming = plan.id === renamingId;
            return (
              <li
                key={plan.id}
                className={`flex items-center gap-1 p-2.5 rounded-md border ${
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
                    <button
                      type="submit"
                      aria-label="Guardar nombre"
                      disabled={busy}
                      className={`${iconBtn} hover:text-emerald-700 hover:bg-emerald-50`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Cancelar"
                      onClick={() => setRenamingId(null)}
                      className={`${iconBtn} hover:bg-slate-100`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleLoad(plan)}
                      className="flex-1 min-w-0 text-left cursor-pointer px-1"
                      title="Cargar este plan"
                    >
                      <div className="text-sm font-bold text-slate-900 truncate">
                        {plan.name}
                        {isActive && (
                          <span className="ml-1.5 text-[11px] font-bold text-orange-700">
                            (abierto)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600">
                        {plan.etfs.length} ETFs · {plan.params.years} años ·{' '}
                        {formatDateShort(plan.updated_at)}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOverwrite(plan)}
                      disabled={busy || (isActive && !isDirty)}
                      aria-label={`Guardar lo actual en ${plan.name}`}
                      title="Sobrescribir con lo que tienes en pantalla"
                      className={`${iconBtn} hover:text-orange-700 hover:bg-orange-50`}
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => startRename(plan)}
                      aria-label={`Renombrar ${plan.name}`}
                      title="Renombrar"
                      className={`${iconBtn} hover:text-slate-900 hover:bg-slate-100`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
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
          Pulsa un plan para cargarlo. <Upload className="inline w-3 h-3" /> guarda en él lo que
          tienes en pantalla, <Pencil className="inline w-3 h-3" /> lo renombra.
        </p>
      </Modal.Root>
    </>
  );
}
