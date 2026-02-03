
import React, { useState, useEffect } from 'react';
import { BackupSchedule, BackupLog, BackupType, FrequencyType, UserRole, User } from '../types';
import { dataService } from '../services/dataService';
import { BACKUP_TYPE_ICONS, STATUS_COLORS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AdminPanelProps {
  role: UserRole;
  initialTab?: 'schedules' | 'stats' | 'users';
}

const AdminPanel: React.FC<AdminPanelProps> = ({ role, initialTab = 'schedules' }) => {
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [logs, setLogs] = useState<BackupLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'schedules' | 'stats' | 'users'>(initialTab);
  
  // Forms states
  const [showUserForm, setShowUserForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  useEffect(() => {
    setSchedules(dataService.getSchedules());
    setLogs(dataService.getLogs());
    setUsers(dataService.getUsers());
    if (role === UserRole.SUPERVISOR) setActiveTab('stats');
  }, [role]);

  const handleCreateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    dataService.saveUser({
      name: fd.get('name') as string,
      lastName: fd.get('lastName') as string,
      email: fd.get('email') as string,
      password: fd.get('password') as string,
      role: fd.get('role') as UserRole,
    });
    setUsers(dataService.getUsers());
    setShowUserForm(false);
  };

  const handleCreateSchedule = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    dataService.saveSchedule({
      name: fd.get('name') as string,
      frequency: fd.get('frequency') as FrequencyType,
      type: fd.get('type') as BackupType,
      description: fd.get('description') as string,
    });
    setSchedules(dataService.getSchedules());
    setShowScheduleForm(false);
  };

  const statusStats = [
    { name: 'Completados', value: logs.filter(l => l.status === 'COMPLETED').length, color: '#22c55e' },
    { name: 'Novedades', value: logs.filter(l => l.status === 'WARNING').length, color: '#eab308' },
    { name: 'Fallidos', value: logs.filter(l => l.status === 'FAILED').length, color: '#ef4444' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-800">
          {role === UserRole.SUPERVISOR ? 'Estadísticas del Sistema' : 'Centro de Control Admin'}
        </h2>
        
        {role === UserRole.ADMIN && (
          <div className="flex p-1 bg-slate-200 rounded-xl gap-1">
            {[
              { id: 'schedules', label: 'Programación' },
              { id: 'stats', label: 'Estadísticas' },
              { id: 'users', label: 'Usuarios' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === t.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTab === 'schedules' && role === UserRole.ADMIN && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {showScheduleForm ? (
            <form onSubmit={handleCreateSchedule} className="p-8 space-y-4">
              <h3 className="text-xl font-bold">Programar Nuevo Respaldo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="name" placeholder="Nombre del respaldo" required className="p-2 border rounded-lg" />
                <select name="frequency" className="p-2 border rounded-lg">
                  <option value={FrequencyType.DAILY}>Diario</option>
                  <option value={FrequencyType.WEEKLY}>Semanal</option>
                </select>
                <select name="type" className="p-2 border rounded-lg">
                  <option value={BackupType.DATABASE}>Base de Datos</option>
                  <option value={BackupType.CLOUD}>Nube</option>
                  <option value={BackupType.FTP}>FTP</option>
                  <option value={BackupType.EXTERNAL_DISK}>Disco Externo</option>
                </select>
                <input name="description" placeholder="Breve descripción" className="p-2 border rounded-lg" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg">Guardar</button>
                <button type="button" onClick={() => setShowScheduleForm(false)} className="bg-slate-200 px-4 py-2 rounded-lg">Cancelar</button>
              </div>
            </form>
          ) : (
            <>
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre del Respaldo</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Frecuencia</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Tipo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{s.name}</p>
                        <p className="text-xs text-slate-400">{s.description}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase">
                          {s.frequency}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xl">{BACKUP_TYPE_ICONS[s.type]}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <button onClick={() => setShowScheduleForm(true)} className="w-full py-3 bg-white border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:bg-slate-100 transition">
                  + Programar Nuevo Respaldo
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Desempeño Global</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusStats} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {statusStats.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-around mt-4">
              {statusStats.map(s => (
                <div key={s.name} className="text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase">{s.name}</p>
                  <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
             <h3 className="text-xl font-bold text-slate-800 mb-6">Logs de Actividad</h3>
             <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2">
                {logs.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-12">Sin actividad reciente.</p>
                ) : logs.sort((a,b) => b.timestamp.localeCompare(a.timestamp)).map(l => (
                  <div key={l.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Log #{l.id.slice(0,4)}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">{l.userName} • {new Date(l.timestamp).toLocaleString()}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase border ${STATUS_COLORS[l.status]}`}>
                      {l.status === 'COMPLETED' ? 'EXITOSO' : l.status === 'WARNING' ? 'NOVEDAD' : 'FALLIDO'}
                    </span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && role === UserRole.ADMIN && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">Gestión de Personal</h3>
            <button onClick={() => setShowUserForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
              + Nuevo Usuario
            </button>
          </div>

          {showUserForm && (
            <form onSubmit={handleCreateUser} className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="name" placeholder="Nombre" required className="p-2 border rounded-lg bg-white" />
                <input name="lastName" placeholder="Apellido" required className="p-2 border rounded-lg bg-white" />
                <input name="email" type="email" placeholder="Correo (Username)" required className="p-2 border rounded-lg bg-white" />
                <input name="password" type="password" placeholder="Contraseña" required className="p-2 border rounded-lg bg-white" />
                <select name="role" className="p-2 border rounded-lg bg-white">
                  <option value={UserRole.ADMIN}>Administrador</option>
                  <option value={UserRole.TECH}>Técnico</option>
                  <option value={UserRole.SUPERVISOR}>Supervisor</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold">Crear Usuario</button>
                <button type="button" onClick={() => setShowUserForm(false)} className="bg-slate-300 text-slate-700 px-6 py-2 rounded-lg font-bold">Cancelar</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map(u => (
              <div key={u.id} className="p-4 border border-slate-200 rounded-xl flex items-center gap-4 bg-slate-50/50">
                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-500 uppercase">
                  {u.name[0]}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{u.name} {u.lastName}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{u.role}</p>
                  <p className="text-[10px] text-blue-500 font-medium truncate max-w-[120px]">{u.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
