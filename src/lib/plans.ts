import type { ETFAsset, SimulationParams } from '../types';
import { supabase } from './supabase';

export interface SavedPlan {
  id: string;
  name: string;
  params: SimulationParams;
  etfs: ETFAsset[];
  created_at: string;
  updated_at: string;
}

function client() {
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase;
}

export async function listPlans(): Promise<SavedPlan[]> {
  const { data, error } = await client()
    .from('plans')
    .select('id, name, params, etfs, created_at, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SavedPlan[];
}

export async function createPlan(name: string, params: SimulationParams, etfs: ETFAsset[]): Promise<SavedPlan> {
  // selectedEtfs ya se guarda aparte en "etfs"; no duplicarlo dentro de params
  const { selectedEtfs: _omit, ...cleanParams } = params;
  const { data, error } = await client()
    .from('plans')
    .insert({ name, params: cleanParams, etfs })
    .select('id, name, params, etfs, created_at, updated_at')
    .single();
  if (error) throw error;
  return data as SavedPlan;
}

export async function updatePlan(id: string, params: SimulationParams, etfs: ETFAsset[]): Promise<SavedPlan> {
  const { selectedEtfs: _omit, ...cleanParams } = params;
  const { data, error } = await client()
    .from('plans')
    .update({ params: cleanParams, etfs })
    .eq('id', id)
    .select('id, name, params, etfs, created_at, updated_at')
    .single();
  if (error) throw error;
  return data as SavedPlan;
}

export async function renamePlan(id: string, name: string): Promise<SavedPlan> {
  const { data, error } = await client()
    .from('plans')
    .update({ name })
    .eq('id', id)
    .select('id, name, params, etfs, created_at, updated_at')
    .single();
  if (error) throw error;
  return data as SavedPlan;
}

/**
 * Huella de lo que define un plan, para saber si hay cambios sin guardar.
 * Ignora datos que se refrescan solos (cotizaciones en vivo, rentabilidades de la API).
 */
export function planFingerprint(params: SimulationParams, etfs: ETFAsset[]): string {
  return JSON.stringify({
    initialCapital: params.initialCapital,
    quarterlyContribution: params.quarterlyContribution,
    years: params.years,
    annualReturn: params.annualReturn,
    contributionFrequency: params.contributionFrequency,
    hasWelcomeBonus: params.hasWelcomeBonus,
    etfs: etfs.map((e) => [e.ticker, e.weight, e.initialWeight ?? null, e.recurringWeight ?? null, e.expectedReturn, e.dividendPolicy ?? 'acc']),
  });
}

export async function deletePlan(id: string): Promise<void> {
  const { error } = await client().from('plans').delete().eq('id', id);
  if (error) throw error;
}
