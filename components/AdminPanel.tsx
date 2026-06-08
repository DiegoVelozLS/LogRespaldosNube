
import React, { useState, useEffect } from 'react';
import { BackupSchedule, BackupLog, BackupType, FrequencyType, UserRole, User, ROLE_LABELS, VaultAuditLog } from '../types';
import { supabaseDataService } from '../services/supabaseDataService';
import { BACKUP_TYPE_ICONS, STATUS_COLORS } from '../constants';
import VaultConfiguration from './VaultConfiguration';

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

interface ResetUserPinModalProps {
  isOpen: boolean;
  targetUser: User | null;
  reason: string;
  error: string;
  isSubmitting: boolean;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const ResetUserPinModal: React.FC<ResetUserPinModalProps> = ({
  isOpen,
  targetUser,
  reason,
  error,
  isSubmitting,
  onReasonChange,
  onConfirm,
  onCancel
}) => {
  if (!isOpen || !targetUser) return null;

  return (
    <div className="fixed inset-0 bg-slate-100/50 backdrop-blur-[1px] flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden transform transition-all">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 .687-.139 1.342-.39 1.938L10 16h4l-1.61-3.062A4.48 4.48 0 0012 11zm0-8a7 7 0 00-7 7c0 1.649.57 3.163 1.523 4.355L5 20h14l-1.523-5.645A6.96 6.96 0 0019 10a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Resetear PIN de bóveda</h3>
              <p className="text-sm text-slate-500">Esta acción invalidará el PIN actual del usuario</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-sm text-slate-700">
            Usuario objetivo:
            <span className="ml-2 font-bold text-slate-900">{targetUser.name} {targetUser.lastName}</span>
          </div>

          <p className="text-sm text-slate-600">
            El usuario deberá ingresar de nuevo a la bóveda y configurar un PIN nuevo.
          </p>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700">Motivo del reseteo</label>
            <textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              rows={3}
              placeholder="Ej: Usuario olvidó PIN y solicitó recuperación"
              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none resize-none"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Reseteando...' : 'Confirmar reseteo'}
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
  initialTab?: 'schedules' | 'users' | 'vault-audit' | 'vault-config';
}

const AdminPanel: React.FC<AdminPanelProps> = ({ user, initialTab = 'schedules' }) => {
  const role = user.role;  // Extraer role del usuario

  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [logs, setLogs] = useState<BackupLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<VaultAuditLog[]>([]);
  const [auditFilter, setAuditFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'schedules' | 'users' | 'vault-audit' | 'vault-config'>(initialTab);
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
  const [resetPinModalOpen, setResetPinModalOpen] = useState(false);
  const [userToResetPin, setUserToResetPin] = useState<User | null>(null);
  const [resetPinReason, setResetPinReason] = useState('Recuperacion de acceso por olvido de PIN');
  const [resetPinLoading, setResetPinLoading] = useState(false);
  const [resetPinError, setResetPinError] = useState('');
  const [adminNotice, setAdminNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [schedulesData, logsData, usersData, auditLogsData] = await Promise.all([
        supabaseDataService.getSchedules(),
        supabaseDataService.getLogs(),
        supabaseDataService.getUsers(),
        supabaseDataService.getVaultAuditLogs()
      ]);
      setSchedules(schedulesData);
      setLogs(logsData);
      setUsers(usersData);
      setAuditLogs(auditLogsData);
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
      const success = await supabaseDataService.updateUser(editingUser.id, userData as any);
      if (!success) {
        alert('Error al actualizar el usuario. Verifica que tengas permisos de administrador.');
        return;
      }
    } else {
      const created = await supabaseDataService.saveUser(userData as any);
      if (!created) {
        alert('Error al crear el usuario.');
        return;
      }
    }
    const updatedUsers = await supabaseDataService.getUsers();
    setUsers(updatedUsers);
    setShowUserForm(false);
    setEditingUser(null);
  };

  const handleResetUserPin = async (targetUser: User) => {
    setUserToResetPin(targetUser);
    setResetPinReason('Recuperacion de acceso por olvido de PIN');
    setResetPinError('');
    setResetPinModalOpen(true);
  };

  const handleConfirmResetUserPin = async () => {
    if (!userToResetPin) {
      setResetPinError('No se encontró el usuario objetivo para resetear PIN.');
      return;
    }
    const targetUser = userToResetPin;

    if (!resetPinReason.trim()) {
      setResetPinError('Debes ingresar un motivo para registrar la auditoria.');
      return;
    }

    setResetPinLoading(true);
    setResetPinError('');
    setAdminNotice(null);

    const result = await supabaseDataService.adminResetUserPin(targetUser.id, resetPinReason.trim());
    if (!result.success) {
      setResetPinLoading(false);
      setResetPinError(result.error || 'No se pudo resetear el PIN del usuario.');
      return;
    }

    const refreshedAudit = await supabaseDataService.getVaultAuditLogs();
    setAuditLogs(refreshedAudit);
    setResetPinLoading(false);
    setResetPinModalOpen(false);
    setUserToResetPin(null);
    setAdminNotice({
      type: 'success',
      message: `PIN reseteado correctamente para ${targetUser.name} ${targetUser.lastName}.`
    });
  };

  const handleCancelResetUserPin = () => {
    if (resetPinLoading) return;
    setResetPinModalOpen(false);
    setUserToResetPin(null);
    setResetPinError('');
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

      <ResetUserPinModal
        isOpen={resetPinModalOpen}
        targetUser={userToResetPin}
        reason={resetPinReason}
        error={resetPinError}
        isSubmitting={resetPinLoading}
        onReasonChange={(value) => setResetPinReason(value)}
        onConfirm={handleConfirmResetUserPin}
        onCancel={handleCancelResetUserPin}
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
              { id: 'vault-audit', label: 'Auditoría Bóveda' },
              { id: 'vault-config', label: 'Config Bóvedas' },
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

          {adminNotice && (
            <div className={`mb-6 p-3 rounded-xl border text-sm ${adminNotice.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {adminNotice.message}
            </div>
          )}

          {showUserForm && (
            <form key={editingUser?.id || 'new'} onSubmit={handleCreateUser} className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
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
                          setUserMenuOpenId(null);
                          void handleResetUserPin(u);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-amber-50 transition flex items-center gap-3 text-sm border-t border-slate-100"
                      >
                        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 .687-.139 1.342-.39 1.938L10 16h4l-1.61-3.062A4.48 4.48 0 0012 11zm0-8a7 7 0 00-7 7c0 1.649.57 3.163 1.523 4.355L5 20h14l-1.523-5.645A6.96 6.96 0 0019 10a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-medium text-amber-700">Resetear PIN bóveda</span>
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

      {activeTab === 'vault-audit' && role === UserRole.ADMIN && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">
          <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <div>
                <h3 className="text-xl font-bold text-slate-800">Auditoría del Gestor de Claves</h3>
              <p className="text-sm text-slate-500 mt-1">Registro histórico de accesos y modificaciones a las credenciales</p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={auditFilter}
                onChange={e => setAuditFilter(e.target.value)}
                className="p-2 border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las Bóvedas</option>
                {Array.from(new Set(auditLogs.map(l => l.vaultCategoryName))).filter(Boolean).map(catName => (
                  <option key={catName} value={catName}>{catName}</option>
                ))}
              </select>
              <div className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-bold rounded-lg border border-blue-200">
                {auditLogs.filter(l => !auditFilter || l.vaultCategoryName === auditFilter).length} Registros
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha y Hora</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acción</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Bóveda</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {auditLogs.filter(l => !auditFilter || l.vaultCategoryName === auditFilter).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                      No hay registros de auditoría disponibles
                    </td>
                  </tr>
                ) : (
                  auditLogs
                    .filter(log => !auditFilter || log.vaultCategoryName === auditFilter)
                    .map((log) => {
                    let actionLabel = log.action;
                    let actionColor = "bg-slate-100 text-slate-700";
                    
                    switch (log.action) {
                      case 'CREATE_CREDENTIAL':
                        actionLabel = 'Creación';
                        actionColor = 'bg-green-100 text-green-700 border-green-200';
                        break;
                      case 'UPDATE_CREDENTIAL':
                        actionLabel = 'Edición';
                        actionColor = 'bg-blue-100 text-blue-700 border-blue-200';
                        break;
                      case 'REVEAL_PASSWORD':
                        actionLabel = 'Visualizó Contraseña';
                        actionColor = 'bg-amber-100 text-amber-700 border-amber-200';
                        break;
                      case 'DELETE_CREDENTIAL':
                        actionLabel = 'Eliminación';
                        actionColor = 'bg-red-100 text-red-700 border-red-200';
                        break;
                      case 'ROTATE_PASSWORD':
                        actionLabel = 'Rotó Contraseña';
                        actionColor = 'bg-purple-100 text-purple-700 border-purple-200';
                        break;
                      case 'RESET_USER_PIN':
                        actionLabel = 'Reseteó PIN';
                        actionColor = 'bg-orange-100 text-orange-700 border-orange-200';
                        break;
                    }

                    return (
                      <tr key={log.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium text-slate-700">
                              {new Date(log.createdAt).toLocaleString('es-ES', { 
                                day: '2-digit', month: 'short', year: 'numeric', 
                                hour: '2-digit', minute: '2-digit' 
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs uppercase">
                              {log.actorName[0]}
                            </div>
                            <span className="font-bold text-slate-800">{log.actorName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${actionColor}`}>
                            {actionLabel}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                            {log.vaultCategoryName}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {log.action === 'RESET_USER_PIN' ? (
                            <div className="inline-flex items-center">
                              <span
                                title={log.credentialTitle}
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs font-bold text-orange-700 cursor-help"
                              >
                                <span className="w-2 h-2 rounded-full bg-orange-500" />
                                Reseteo
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                              <span className="font-medium text-slate-700">{log.credentialTitle}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeTab === 'vault-config' && role === UserRole.ADMIN && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">
          <VaultConfiguration users={users} />
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
