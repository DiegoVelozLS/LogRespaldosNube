
import React, { useState, useEffect } from 'react';
import { User, BackupSchedule, BackupStatus } from '../types';
import { dataService } from '../services/dataService';
import { BACKUP_TYPE_ICONS, STATUS_COLORS } from '../constants';
import { ClockIcon, CheckIcon } from './Icons';

const BackupRegistration: React.FC<{ user: User; onComplete: () => void }> = ({ user, onComplete }) => {
  const [availableTasks, setAvailableTasks] = useState<BackupSchedule[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [status, setStatus] = useState<BackupStatus>(BackupStatus.COMPLETED);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const tasks = dataService.getTasksForDate(new Date());
    // Filtrar tareas que no han sido registradas hoy
    setAvailableTasks(tasks.filter(t => !t.log).map(t => t.schedule));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId) return;

    setIsSubmitting(true);
    const now = new Date();
    
    dataService.saveLog({
      scheduleId: selectedTaskId,
      status,
      notes,
      timestamp: now.toISOString(),
      dateStr: now.toISOString().split('T')[0],
      userId: user.id,
      userName: user.name
    });

    setTimeout(() => {
      setIsSubmitting(false);
      onComplete();
    }, 600);
  };

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Registrar Respaldo</h2>
        <p className="text-slate-500 mb-8">Registra una tarea completada o reporta un fallo en las asignaciones de hoy.</p>

        {availableTasks.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
             <div className="text-green-500 mb-4 flex justify-center"><CheckIcon /></div>
             <p className="text-slate-600 font-medium">¡Todo está al día!</p>
             <p className="text-slate-400 text-sm">Todas las tareas programadas para hoy ya han sido registradas.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Tarea de Respaldo</label>
              <select 
                required
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-slate-50 text-slate-900 font-medium"
              >
                <option value="" className="text-slate-900">Selecciona un respaldo pendiente...</option>
                {availableTasks.map(task => (
                  <option key={task.id} value={task.id} className="text-slate-900">
                    {BACKUP_TYPE_ICONS[task.type]} {task.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Resultado de la Ejecución</label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: BackupStatus.COMPLETED, label: 'Éxito', color: 'bg-green-50 text-green-700 border-green-200' },
                  { id: BackupStatus.WARNING, label: 'Novedad', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
                  { id: BackupStatus.FAILED, label: 'Fallo', color: 'bg-red-50 text-red-700 border-red-200' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatus(s.id)}
                    className={`px-4 py-3 rounded-xl border-2 text-sm font-bold transition ${status === s.id ? s.color + ' border-current' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Notas / Comentarios</label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe cualquier inconveniente o deja en blanco si todo salió bien..."
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition min-h-[120px] text-slate-900"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4 text-xs text-slate-500">
               <ClockIcon />
               <div>
                 <p className="font-bold uppercase tracking-widest text-[10px]">Metadatos Generados Automáticamente</p>
                 <p>Fecha: {new Date().toLocaleDateString()} | Hora: {new Date().toLocaleTimeString()} | Usuario: {user.name}</p>
                 <p className="mt-1 italic">Este registro será inmutable una vez enviado.</p>
               </div>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting || !selectedTaskId}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition transform active:scale-95 ${isSubmitting || !selectedTaskId ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isSubmitting ? 'Registrando...' : 'Finalizar y Guardar Log'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default BackupRegistration;
