
import React, { useState, useEffect } from 'react';
import { User, BackupLog, BackupSchedule, BackupStatus } from '../types';
import { supabaseDataService } from '../services/supabaseDataService';
import { AlertIcon, CheckIcon, ClockIcon, TrashIcon } from './Icons';
import { STATUS_COLORS, BACKUP_TYPE_ICONS } from '../constants';

interface DashboardProps {
  user: User;
  onRefresh: () => void;
  onNavigateToRegister: (scheduleId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onRefresh, onNavigateToRegister }) => {
  const [tasks, setTasks] = useState<{ schedule: BackupSchedule; log?: BackupLog }[]>([]);
  const [loading, setLoading] = useState(true);
  
  const refreshTasks = async () => {
    setLoading(true);
    const todayTasks = await supabaseDataService.getTasksForDate(new Date());
    setTasks(todayTasks);
    onRefresh();
    setLoading(false);
  };

  useEffect(() => {
    refreshTasks();
  }, []);

  const handleUndo = async (logId: string) => {
    if (confirm('¿Estás seguro de que deseas deshacer este registro? La tarea volverá a estar pendiente.')) {
      await supabaseDataService.deleteLog(logId);
      refreshTasks();
    }
  };

  const pendingCount = tasks.filter(t => !t.log).length;
  const completedCount = tasks.filter(t => t.log?.status === BackupStatus.COMPLETED).length;
  const issueCount = tasks.filter(t => t.log && (t.log.status === BackupStatus.WARNING || t.log.status === BackupStatus.FAILED)).length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Vista Operativa</h2>
          <p className="text-slate-500">Tareas asignadas para hoy, {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 px-4 py-2 rounded-xl shadow-sm">
            <AlertIcon />
            <span className="font-semibold">{pendingCount} respaldos requieren atención</span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <ClockIcon />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Pendientes</p>
              <p className="text-2xl font-bold text-slate-800">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <CheckIcon />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Completados</p>
              <p className="text-2xl font-bold text-slate-800">{completedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl">
              <AlertIcon />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Con Novedades</p>
              <p className="text-2xl font-bold text-slate-800">{issueCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Tareas de Hoy</h3>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{tasks.length} en total</span>
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              Cargando tareas...
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No hay respaldos programados para el día de hoy.
            </div>
          ) : tasks.map(({ schedule, log }) => (
            <div 
              key={schedule.id} 
              onClick={() => !log && onNavigateToRegister(schedule.id)}
              className={`p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                log ? 'hover:bg-slate-50' : 'hover:bg-blue-50 cursor-pointer'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="text-2xl bg-slate-100 p-3 rounded-xl">
                  {BACKUP_TYPE_ICONS[schedule.type]}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">{schedule.name}</h4>
                  <p className="text-sm text-slate-500 max-w-md">{schedule.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {log ? (
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[log.status]}`}>
                        {log.status === BackupStatus.COMPLETED ? 'COMPLETADO' : 
                         log.status === BackupStatus.WARNING ? 'CON NOVEDAD' : 'FALLIDO'}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">
                        Por {log.userName} @ {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleUndo(log.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Deshacer registro"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                     <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS.PENDING}`}>
                      PENDIENTE
                    </span>
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                    <div className="text-blue-600 font-bold text-sm flex items-center gap-1">
                      <span>Clic para registrar</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
