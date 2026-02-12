
import React, { useState, useEffect } from 'react';
import { User, BackupLog, BackupSchedule } from '../types';
import { supabaseDataService } from '../services/supabaseDataService';
import { BACKUP_TYPE_ICONS, STATUS_COLORS } from '../constants';

const CalendarView: React.FC<{ user: User }> = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [monthTasks, setMonthTasks] = useState<Map<string, { schedule: BackupSchedule; log?: BackupLog }[]>>(new Map());
  const [loading, setLoading] = useState(true);

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  useEffect(() => {
    const loadMonthData = async () => {
      setLoading(true);
      const totalDays = daysInMonth(year, month);
      const tasksMap = new Map<string, { schedule: BackupSchedule; log?: BackupLog }[]>();
      
      // Cargar tareas para cada día del mes
      for (let d = 1; d <= totalDays; d++) {
        const checkDate = new Date(year, month, d);
        const dateStr = checkDate.toISOString().split('T')[0];
        const tasks = await supabaseDataService.getTasksForDate(checkDate);
        tasksMap.set(dateStr, tasks);
      }
      
      setMonthTasks(tasksMap);
      setLoading(false);
    };

    loadMonthData();
  }, [currentDate]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const getDayStatus = (d: number) => {
    const checkDate = new Date(year, month, d);
    const dateStr = checkDate.toISOString().split('T')[0];
    const tasks = monthTasks.get(dateStr) || [];
    if (tasks.length === 0) return 'empty';
    const allDone = tasks.every(t => !!t.log);
    const hasFailed = tasks.some(t => t.log?.status === 'FAILED');
    const hasWarnings = tasks.some(t => t.log?.status === 'WARNING');
    
    if (hasFailed) return 'failed';
    if (!allDone) return 'pending';
    if (hasWarnings) return 'warning';
    return 'success';
  };

  const selectedDayTasks = selectedDay ? (monthTasks.get(selectedDay.toISOString().split('T')[0]) || []) : [];

  return (
    <div className="space-y-6 animate-fadeIn">
      <h2 className="text-3xl font-bold text-slate-800">Seguimiento Histórico</h2>
      
      {loading ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
          <p className="text-slate-400">Cargando calendario...</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar Body */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-700">{monthNames[month]} {year}</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentDate(new Date(year, month - 1))}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                ←
              </button>
              <button 
                onClick={() => setCurrentDate(new Date(year, month + 1))}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center mb-4">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
              <div key={d} className="text-xs font-bold text-slate-400 uppercase tracking-widest py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`pad-${i}`} className="h-20 lg:h-24"></div>
            ))}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const status = getDayStatus(day);
              const isSelected = selectedDay?.getDate() === day && selectedDay?.getMonth() === month;
              
              let bgColor = 'bg-white';
              let borderColor = 'border-slate-100';
              if (status === 'success') bgColor = 'bg-green-50';
              if (status === 'failed') bgColor = 'bg-red-50';
              if (status === 'warning') bgColor = 'bg-yellow-50';
              if (status === 'pending') bgColor = 'bg-slate-100';

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(new Date(year, month, day))}
                  className={`h-20 lg:h-24 flex flex-col items-center justify-center rounded-xl border-2 transition relative ${bgColor} ${isSelected ? 'border-blue-500' : borderColor} hover:border-slate-300`}
                >
                  <span className="text-lg font-bold text-slate-700">{day}</span>
                  {status !== 'empty' && (
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      status === 'success' ? 'bg-green-500' :
                      status === 'failed' ? 'bg-red-500' :
                      status === 'warning' ? 'bg-yellow-500' : 'bg-slate-400'
                    }`}></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-xl font-bold text-slate-800 mb-6">
            Detalles del {selectedDay?.toLocaleDateString()}
          </h3>
          <div className="space-y-4">
            {selectedDayTasks.length === 0 ? (
              <p className="text-slate-400 text-center py-10 italic">No hay tareas programadas para este día.</p>
            ) : (
              selectedDayTasks.map(({ schedule, log }) => (
                <div key={schedule.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg">{BACKUP_TYPE_ICONS[schedule.type]}</span>
                    <h4 className="font-bold text-slate-800">{schedule.name}</h4>
                  </div>
                  {log ? (
                    <div className="space-y-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[log.status]}`}>
                        {log.status === 'COMPLETED' ? 'COMPLETADO' : 
                         log.status === 'WARNING' ? 'CON NOVEDAD' : 'FALLIDO'}
                      </span>
                      <p className="text-sm text-slate-600 italic">"{log.notes || 'Sin comentarios registrados'}"</p>
                      <p className="text-xs text-slate-400">Registrado por {log.userName} a las {new Date(log.timestamp).toLocaleTimeString()}</p>
                    </div>
                  ) : (
                    <div className="text-red-500 text-xs font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                      NO REALIZADO AÚN
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default CalendarView;
