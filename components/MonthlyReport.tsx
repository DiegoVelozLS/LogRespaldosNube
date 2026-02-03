
import React, { useState, useEffect } from 'react';
import { User, BackupLog, BackupSchedule, BackupStatus } from '../types';
import { dataService } from '../services/dataService';
import { BACKUP_TYPE_ICONS, STATUS_COLORS } from '../constants';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

interface MonthlyReportProps {
  user: User;
}

const MonthlyReport: React.FC<MonthlyReportProps> = ({ user }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    generateReport();
  }, [selectedMonth, selectedYear]);

  const generateReport = () => {
    const data = dataService.getMonthlyReport(selectedYear, selectedMonth);
    setReportData(data);
  };

  const exportToCSV = () => {
    if (!reportData) return;

    const csvRows = [
      ['Reporte Mensual de Respaldos - Listosoft'],
      [`Período: ${getMonthName(selectedMonth)} ${selectedYear}`],
      [`Generado por: ${user.name} ${user.lastName}`],
      [`Fecha de generación: ${new Date().toLocaleString()}`],
      [],
      ['RESUMEN EJECUTIVO'],
      ['Total Programados', reportData.summary.totalScheduled],
      ['Total Ejecutados', reportData.summary.totalExecuted],
      ['Exitosos', reportData.summary.successful],
      ['Fallidos', reportData.summary.failed],
      ['Con Novedades', reportData.summary.warnings],
      ['Tasa de Éxito', `${reportData.summary.successRate}%`],
      [],
      ['DESGLOSE POR TIPO'],
      ['Tipo', 'Ejecutados', 'Exitosos', 'Fallidos', 'Novedades'],
      ...reportData.byType.map((item: any) => [
        item.type,
        item.executed,
        item.successful,
        item.failed,
        item.warnings
      ]),
      [],
      ['DESEMPEÑO POR TÉCNICO'],
      ['Técnico', 'Registros', 'Tasa de Éxito'],
      ...reportData.byTechnician.map((item: any) => [
        item.name,
        item.count,
        `${item.successRate}%`
      ]),
      [],
      ['INCIDENTES CRÍTICOS'],
      ['Fecha', 'Respaldo', 'Estado', 'Técnico', 'Notas'],
      ...reportData.criticalIncidents.map((log: BackupLog) => [
        new Date(log.timestamp).toLocaleString(),
        reportData.scheduleNames[log.scheduleId] || log.scheduleId,
        log.status,
        log.userName,
        log.notes
      ])
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Reporte_${getMonthName(selectedMonth)}_${selectedYear}.csv`;
    link.click();
  };

  const getMonthName = (month: number) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[month];
  };

  if (!reportData) {
    return <div className="p-8 text-center">Cargando reporte...</div>;
  }

  const pieData = [
    { name: 'Exitosos', value: reportData.summary.successful, color: '#22c55e' },
    { name: 'Fallidos', value: reportData.summary.failed, color: '#ef4444' },
    { name: 'Novedades', value: reportData.summary.warnings, color: '#eab308' }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Reportes Mensuales</h2>
          <p className="text-slate-500">Análisis detallado del desempeño de respaldos</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Month/Year Selector */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <label className="text-sm font-bold text-slate-700">Seleccionar Período:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>{getMonthName(i)}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
          <button
            onClick={generateReport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
          >
            Generar Reporte
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-8 rounded-2xl shadow-lg">
        <h3 className="text-2xl font-bold mb-6">Resumen Ejecutivo - {getMonthName(selectedMonth)} {selectedYear}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">Total Ejecutados</p>
            <p className="text-4xl font-bold">{reportData.summary.totalExecuted}</p>
          </div>
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">Tasa de Éxito</p>
            <p className="text-4xl font-bold">{reportData.summary.successRate}%</p>
          </div>
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">Fallidos</p>
            <p className="text-4xl font-bold">{reportData.summary.failed}</p>
          </div>
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">Novedades</p>
            <p className="text-4xl font-bold">{reportData.summary.warnings}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pie Chart */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Distribución de Resultados</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-around mt-4">
            {pieData.map(item => (
              <div key={item.name} className="text-center">
                <p className="text-xs font-bold text-slate-400 uppercase">{item.name}</p>
                <p className="text-lg font-bold" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart by Type */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Desempeño por Tipo</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.byType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="successful" fill="#22c55e" name="Exitosos" />
                <Bar dataKey="failed" fill="#ef4444" name="Fallidos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Performance by Technician */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Desempeño por Técnico</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Técnico</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Registros</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Exitosos</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Fallidos</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Tasa de Éxito</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.byTechnician.map((tech: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-slate-800">{tech.name}</td>
                  <td className="px-6 py-4 text-slate-600">{tech.count}</td>
                  <td className="px-6 py-4 text-green-600 font-semibold">{tech.successful}</td>
                  <td className="px-6 py-4 text-red-600 font-semibold">{tech.failed}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      tech.successRate >= 90 ? 'bg-green-100 text-green-700' :
                      tech.successRate >= 70 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {tech.successRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Critical Incidents */}
      {reportData.criticalIncidents.length > 0 && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Incidentes Críticos</h3>
          <div className="space-y-4">
            {reportData.criticalIncidents.map((log: BackupLog) => (
              <div key={log.id} className="p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[log.status]}`}>
                        {log.status === 'FAILED' ? 'FALLIDO' : 'NOVEDAD'}
                      </span>
                      <span className="font-bold text-slate-800">
                        {reportData.scheduleNames[log.scheduleId] || 'Respaldo desconocido'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 italic">"{log.notes || 'Sin comentarios'}"</p>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <p className="font-bold">{new Date(log.timestamp).toLocaleDateString()}</p>
                    <p>{new Date(log.timestamp).toLocaleTimeString()}</p>
                    <p>Por: {log.userName}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {reportData.recommendations.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-200 p-8 rounded-2xl">
          <h3 className="text-xl font-bold text-yellow-800 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Observaciones y Recomendaciones
          </h3>
          <ul className="space-y-2">
            {reportData.recommendations.map((rec: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2 text-yellow-900">
                <span className="text-yellow-600 font-bold">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MonthlyReport;
