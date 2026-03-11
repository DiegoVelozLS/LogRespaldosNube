
import React, { useState, useEffect } from 'react';
import { BackupSchedule, BackupLog, BackupType, FrequencyType, UserRole, User, Server, ROLE_LABELS } from '../types';
import { supabaseDataService } from '../services/supabaseDataService';
import { BACKUP_TYPE_ICONS, STATUS_COLORS } from '../constants';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  scheduleName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ isOpen, scheduleName, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Confirmar Eliminación</h3>
              <p className="text-sm text-slate-500">Esta acción no se puede deshacer</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-slate-700 mb-2">¿Estás seguro de que deseas eliminar la programación:</p>
          <p className="font-bold text-slate-900 text-lg mb-4">"{scheduleName}"</p>
          <p className="text-sm text-slate-500">Se eliminarán todos los datos relacionados con esta programación.</p>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
          >
            Sí, Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

interface ConfirmDeleteUserModalProps {
  isOpen: boolean;
  userName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDeleteUserModal: React.FC<ConfirmDeleteUserModalProps> = ({ isOpen, userName, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Confirmar Eliminación</h3>
              <p className="text-sm text-slate-500">Esta acción no se puede deshacer</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-slate-700 mb-2">¿Estás seguro de que deseas eliminar al usuario:</p>
          <p className="font-bold text-slate-900 text-lg mb-4">"{userName}"</p>
          <p className="text-sm text-slate-500">Se eliminarán todos los datos relacionados con este usuario.</p>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
          >
            Sí, Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

interface ScheduleFormProps {
  onSave: (schedule: Omit<BackupSchedule, 'id'>) => void;
  onCancel: () => void;
  editingSchedule?: BackupSchedule | null;
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({ onSave, onCancel, editingSchedule }) => {
  const [name, setName] = useState(editingSchedule?.name || '');
  const [frequency, setFrequency] = useState<FrequencyType>(editingSchedule?.frequency || FrequencyType.DAILY);
  const [type, setType] = useState<BackupType>(editingSchedule?.type || BackupType.DATABASE);
  const [description, setDescription] = useState(editingSchedule?.description || '');
  const [selectedDays, setSelectedDays] = useState<number[]>(editingSchedule?.daysOfWeek || [1]); // Por defecto Lunes

  const daysOfWeek = [
    { id: 0, label: 'Domingo', short: 'Dom' },
    { id: 1, label: 'Lunes', short: 'Lun' },
    { id: 2, label: 'Martes', short: 'Mar' },
    { id: 3, label: 'Miércoles', short: 'Mié' },
    { id: 4, label: 'Jueves', short: 'Jue' },
    { id: 5, label: 'Viernes', short: 'Vie' },
    { id: 6, label: 'Sábado', short: 'Sáb' },
  ];

  const toggleDay = (dayId: number) => {
    setSelectedDays(prev =>
      prev.includes(dayId)
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId].sort()
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      frequency,
      type,
      description,
      daysOfWeek: frequency === FrequencyType.CUSTOM ? selectedDays : undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 space-y-6">
      <h3 className="text-xl font-bold">{editingSchedule ? 'Editar Programación de Respaldo' : 'Programar Nuevo Respaldo'}</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700">Nombre del respaldo</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Respaldo BD Producción"
            required
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700">Tipo de respaldo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as BackupType)}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value={BackupType.DATABASE}>📊 Base de Datos</option>
            <option value={BackupType.CLOUD}>☁️ Nube</option>
            <option value={BackupType.FTP}>🌐 FTP</option>
            <option value={BackupType.EXTERNAL_DISK}>💾 Disco Externo</option>
            <option value={BackupType.DELETE_BACKUP}>🗑️ Eliminar Respaldo</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-bold text-slate-700">Frecuencia</label>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: FrequencyType.DAILY, label: 'Diario', desc: 'Todos los días' },
            { value: FrequencyType.WEEKLY, label: 'Semanal', desc: 'Una vez por semana' },
            { value: FrequencyType.CUSTOM, label: 'Personalizado', desc: 'Días específicos' }
          ].map((freq) => (
            <button
              key={freq.value}
              type="button"
              onClick={() => setFrequency(freq.value)}
              className={`p-4 rounded-xl border-2 text-left transition ${frequency === freq.value
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
            >
              <p className="font-bold text-sm">{freq.label}</p>
              <p className="text-xs opacity-70">{freq.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {frequency === FrequencyType.CUSTOM && (
        <div className="space-y-2 animate-fadeIn">
          <label className="block text-sm font-bold text-slate-700">Selecciona los días</label>
          <div className="grid grid-cols-7 gap-2">
            {daysOfWeek.map((day) => (
              <button
                key={day.id}
                type="button"
                onClick={() => toggleDay(day.id)}
                className={`p-3 rounded-lg border-2 text-center transition ${selectedDays.includes(day.id)
                  ? 'bg-blue-600 border-blue-600 text-white font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
              >
                <p className="text-xs font-bold">{day.short}</p>
              </button>
            ))}
          </div>
          {selectedDays.length === 0 && (
            <p className="text-xs text-red-500 mt-1">⚠️ Selecciona al menos un día</p>
          )}
        </div>
      )}

      {frequency === FrequencyType.WEEKLY && (
        <div className="space-y-2 animate-fadeIn">
          <label className="block text-sm font-bold text-slate-700">Día de la semana</label>
          <select
            value={selectedDays[0] || 1}
            onChange={(e) => setSelectedDays([parseInt(e.target.value)])}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {daysOfWeek.map((day) => (
              <option key={day.id} value={day.id}>{day.label}</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-bold text-slate-700">Descripción</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Breve descripción del respaldo"
          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={frequency === FrequencyType.CUSTOM && selectedDays.length === 0}
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-slate-400 disabled:cursor-not-allowed"
        >
          {editingSchedule ? 'Actualizar Programación' : 'Guardar Programación'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};

interface AdminPanelProps {
  user: User;
  initialTab?: 'schedules' | 'users' | 'servers';
}

const AdminPanel: React.FC<AdminPanelProps> = ({ user, initialTab = 'schedules' }) => {
  const role = user.role;  // Extraer role del usuario

  // Verificar permisos - ADMIN tiene todos los permisos
  const hasPermission = (key: string) => {
    if (role === 'ADMIN') return true;
    return user.permissions?.includes(key) ?? false;
  };

  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [logs, setLogs] = useState<BackupLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [newServerName, setNewServerName] = useState('');
  const [activeTab, setActiveTab] = useState<'schedules' | 'users' | 'servers'>(initialTab);
  const [loading, setLoading] = useState(true);

  // Forms states
  const [showUserForm, setShowUserForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<BackupSchedule | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [userMenuOpenId, setUserMenuOpenId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<BackupSchedule | null>(null);
  const [deleteUserModalOpen, setDeleteUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [schedulesData, logsData, usersData, serversData] = await Promise.all([
        supabaseDataService.getSchedules(),
        supabaseDataService.getLogs(),
        supabaseDataService.getUsers(),
        supabaseDataService.getServers()
      ]);
      setSchedules(schedulesData);
      setLogs(logsData);
      setUsers(usersData);
      setServers(serversData);
      setLoading(false);
    };
    loadData();
  }, [role]);

  useEffect(() => {
    const handleClickOutside = () => {
      setMenuOpenId(null);
      setUserMenuOpenId(null);
    };
    if (menuOpenId || userMenuOpenId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [menuOpenId, userMenuOpenId]);

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const userData = {
      name: fd.get('name') as string,
      lastName: fd.get('lastName') as string,
      email: fd.get('email') as string,
      password: fd.get('password') as string,
      role: fd.get('role') as string,
    };

    // Validación de contraseña
    if (!editingUser && (!userData.password || userData.password.length < 6)) {
      alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (editingUser && userData.password && userData.password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (editingUser) {
      await supabaseDataService.updateUser(editingUser.id, userData as any);
    } else {
      await supabaseDataService.saveUser(userData as any);
    }
    const updatedUsers = await supabaseDataService.getUsers();
    setUsers(updatedUsers);
    setShowUserForm(false);
    setEditingUser(null);
  };

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName.trim()) return;
    await supabaseDataService.saveServer(newServerName.trim());
    const updatedServers = await supabaseDataService.getServers();
    setServers(updatedServers);
    setNewServerName('');
  };

  const handleDeleteServer = async (serverId: string) => {
    await supabaseDataService.deleteServer(serverId);
    const updatedServers = await supabaseDataService.getServers();
    setServers(updatedServers);
  };

  const statusStats = [
    { name: 'Completados', value: logs.filter(l => l.status === 'COMPLETED').length, color: '#22c55e' },
    { name: 'Novedades', value: logs.filter(l => l.status === 'WARNING').length, color: '#eab308' },
    { name: 'Fallidos', value: logs.filter(l => l.status === 'FAILED').length, color: '#ef4444' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        scheduleName={scheduleToDelete?.name || ''}
        onConfirm={async () => {
          if (scheduleToDelete) {
            await supabaseDataService.deleteSchedule(scheduleToDelete.id);
            const updatedSchedules = await supabaseDataService.getSchedules();
            setSchedules(updatedSchedules);
          }
          setDeleteModalOpen(false);
          setScheduleToDelete(null);
        }}
        onCancel={() => {
          setDeleteModalOpen(false);
          setScheduleToDelete(null);
        }}
      />

      <ConfirmDeleteUserModal
        isOpen={deleteUserModalOpen}
        userName={userToDelete ? `${userToDelete.name} ${userToDelete.lastName}` : ''}
        onConfirm={async () => {
          if (userToDelete) {
            await supabaseDataService.deleteUser(userToDelete.id);
            const updatedUsers = await supabaseDataService.getUsers();
            setUsers(updatedUsers);
          }
          setDeleteUserModalOpen(false);
          setUserToDelete(null);
        }}
        onCancel={() => {
          setDeleteUserModalOpen(false);
          setUserToDelete(null);
        }}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-800">
          Centro de Control Admin
        </h2>

        {role === 'ADMIN' && (
          <div className="flex p-1 bg-slate-200 rounded-xl gap-1">
            {[
              { id: 'schedules', label: 'Programación' },
              { id: 'users', label: 'Usuarios' },
              { id: 'servers', label: 'Servidores' },
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
            <ScheduleForm
              editingSchedule={editingSchedule}
              onCancel={() => {
                setShowScheduleForm(false);
                setEditingSchedule(null);
              }}
              onSave={async (schedule) => {
                if (editingSchedule) {
                  await supabaseDataService.updateSchedule(editingSchedule.id, schedule);
                } else {
                  await supabaseDataService.saveSchedule(schedule);
                }
                const updatedSchedules = await supabaseDataService.getSchedules();
                setSchedules(updatedSchedules);
                setShowScheduleForm(false);
                setEditingSchedule(null);
              }} />
          ) : (
            <>
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre del Respaldo</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Frecuencia</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Tipo</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Acciones</th>
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
                          {s.frequency === 'CUSTOM' && s.daysOfWeek ?
                            `Personalizado: ${s.daysOfWeek.map(d => ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d]).join(', ')}`
                            : s.frequency === 'DAILY' ? 'Diario' : 'Semanal'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xl">{BACKUP_TYPE_ICONS[s.type]}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId(menuOpenId === s.id ? null : s.id);
                            }}
                            className="p-2 hover:bg-slate-100 rounded-lg transition"
                          >
                            <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 16 16">
                              <circle cx="8" cy="3" r="1.5" />
                              <circle cx="8" cy="8" r="1.5" />
                              <circle cx="8" cy="13" r="1.5" />
                            </svg>
                          </button>
                          {menuOpenId === s.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-10 overflow-hidden">
                              <button
                                onClick={() => {
                                  setEditingSchedule(s);
                                  setShowScheduleForm(true);
                                  setMenuOpenId(null);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition flex items-center gap-3 text-sm"
                              >
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span className="font-medium text-slate-700">Editar</span>
                              </button>
                              <button
                                onClick={() => {
                                  setScheduleToDelete(s);
                                  setDeleteModalOpen(true);
                                  setMenuOpenId(null);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-red-50 transition flex items-center gap-3 text-sm border-t border-slate-100"
                              >
                                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span className="font-medium text-red-600">Eliminar</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <button onClick={() => {
                  setEditingSchedule(null);
                  setShowScheduleForm(true);
                }} className="w-full py-3 bg-white border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:bg-slate-100 transition">
                  + Programar Nuevo Respaldo
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'users' && role === UserRole.ADMIN && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">Gestión de Personal</h3>
            <button onClick={() => { setEditingUser(null); setShowUserForm(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
              + Nuevo Usuario
            </button>
          </div>

          {showUserForm && (
            <form onSubmit={handleCreateUser} className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <h4 className="text-lg font-bold text-slate-800 mb-2">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="name" defaultValue={editingUser?.name} placeholder="Nombre" required className="p-2 border rounded-lg bg-white" />
                <input name="lastName" defaultValue={editingUser?.lastName} placeholder="Apellido" required className="p-2 border rounded-lg bg-white" />
                <input name="email" type="email" defaultValue={editingUser?.email} placeholder="Correo (Username)" required className="p-2 border rounded-lg bg-white" />
                <input name="password" type="password" placeholder={editingUser ? 'Nueva contraseña (dejar vacío para mantener)' : 'Contraseña'} required={!editingUser} className="p-2 border rounded-lg bg-white" />
                <select name="role" defaultValue={editingUser?.role || 'SOPORTE'} className="p-2 border rounded-lg bg-white" required>
                  <option value="ADMIN">Administrador - Acceso completo</option>
                  <option value="TECH">Técnico - Todo excepto administración</option>
                  <option value="SOPORTE">Soporte - Solo intranet</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold">{editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}</button>
                <button type="button" onClick={() => { setShowUserForm(false); setEditingUser(null); }} className="bg-slate-300 text-slate-700 px-6 py-2 rounded-lg font-bold">Cancelar</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map(u => (
              <div key={u.id} className="p-4 border border-slate-200 rounded-xl flex items-center gap-4 bg-slate-50/50 relative">
                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-500 uppercase">
                  {u.name[0]}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800">{u.name} {u.lastName}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{u.role}</p>
                  <p className="text-[10px] text-blue-500 font-medium truncate max-w-[120px]">{u.email}</p>
                </div>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUserMenuOpenId(userMenuOpenId === u.id ? null : u.id);
                    }}
                    className="p-2 hover:bg-slate-200 rounded-lg transition"
                  >
                    <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 16 16">
                      <circle cx="8" cy="3" r="1.5" />
                      <circle cx="8" cy="8" r="1.5" />
                      <circle cx="8" cy="13" r="1.5" />
                    </svg>
                  </button>
                  {userMenuOpenId === u.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-10 overflow-hidden">
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setShowUserForm(true);
                          setUserMenuOpenId(null);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition flex items-center gap-3 text-sm"
                      >
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span className="font-medium text-slate-700">Editar</span>
                      </button>
                      <button
                        onClick={() => {
                          setUserToDelete(u);
                          setDeleteUserModalOpen(true);
                          setUserMenuOpenId(null);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-red-50 transition flex items-center gap-3 text-sm border-t border-slate-100"
                      >
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="font-medium text-red-600">Eliminar</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'servers' && role === UserRole.ADMIN && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-fadeIn">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-800">Dirección de Servidores</h3>
              <p className="text-sm text-slate-500">Configura los nombres de los servidores que aparecerán en el directorio.</p>
            </div>
          </div>

          <form onSubmit={handleAddServer} className="flex gap-3 mb-8">
            <input
              type="text"
              placeholder="Nombre del nuevo servidor (ej: Servidor 3)"
              value={newServerName}
              onChange={e => setNewServerName(e.target.value)}
              className="flex-1 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
              required
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-sm flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Añadir
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {servers.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 italic bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                No hay servidores configurados. Añade uno arriba.
              </div>
            ) : (
              servers.map(s => (
                <div key={s.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between group hover:border-blue-200 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xs">
                      S
                    </div>
                    <span className="font-bold text-slate-700">{s.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteServer(s.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                    title="Eliminar servidor"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
