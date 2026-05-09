'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AdminUsersResponse } from '@/types';

function formatDate(date: string | null) {
  if (!date) return 'Nunca';

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

function formatDuration(ms: number) {
  if (ms <= 0) return '0 s';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export default function AdminDashboard() {
  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = () => {
    startTransition(async () => {
      try {
        setError(null);
        const response = await fetch('/api/admin/users');

        if (!response.ok) {
          throw new Error('No se pudo cargar el panel.');
        }

        const payload = (await response.json()) as AdminUsersResponse;
        setData(payload);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Error inesperado.');
      }
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const deleteUser = async (id: string) => {
    if (!window.confirm('¿Eliminar este usuario y todos sus diagramas?')) return;
    const response = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    if (response.ok) loadData();
  };

  const deleteDiagram = async (userId: string) => {
    const diagramId = window.prompt('Pega aquí el ID del diagrama que quieres eliminar.');
    if (!diagramId) return;
    const response = await fetch(`/api/admin/diagrams/${diagramId}`, { method: 'DELETE' });
    if (response.ok) loadData();
    if (!response.ok) {
      window.alert(`No se pudo eliminar el diagrama para ${userId}.`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Panel de administración</h1>
            <p className="mt-2 text-sm text-slate-400">
              Usuarios, actividad reciente y mantenimiento de diagramas.
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500"
          >
            {isPending ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-900 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="mb-4 text-lg font-medium">Actividad de usuarios</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.activity ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: 16,
                  }}
                />
                <Legend />
                <Bar dataKey="diagramsCreated" fill="#06b6d4" name="Diagramas" radius={[8, 8, 0, 0]} />
                <Bar dataKey="userRegistrations" fill="#22c55e" name="Registros" radius={[8, 8, 0, 0]} />
                <Bar dataKey="logins" fill="#f59e0b" name="Logins" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="text-lg font-medium">Usuarios registrados</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Usuario</th>
                  <th className="px-5 py-3 font-medium">Rol</th>
                  <th className="px-5 py-3 font-medium">Diagramas</th>
                  <th className="px-5 py-3 font-medium">Último acceso</th>
                  <th className="px-5 py-3 font-medium">Simulación total</th>
                  <th className="px-5 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(data?.users ?? []).map((user) => (
                  <tr key={user.id} className="border-t border-slate-800">
                    <td className="px-5 py-4">
                      <div className="font-medium text-white">{user.name || 'Sin nombre'}</div>
                      <div className="text-slate-400">{user.email}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full border border-slate-700 px-3 py-1 text-xs">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">{user.diagramCount}</td>
                    <td className="px-5 py-4">{formatDate(user.lastLoginAt)}</td>
                    <td className="px-5 py-4">{formatDuration(user.totalSimulationMs)}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => deleteDiagram(user.id)}
                          className="rounded-lg border border-amber-800 px-3 py-2 text-xs text-amber-200 transition hover:bg-amber-950/50"
                        >
                          Eliminar diagrama
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteUser(user.id)}
                          className="rounded-lg border border-rose-800 px-3 py-2 text-xs text-rose-200 transition hover:bg-rose-950/50"
                        >
                          Eliminar usuario
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
