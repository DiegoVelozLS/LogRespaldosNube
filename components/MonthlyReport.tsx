
import React, { useState, useEffect } from 'react';
import { User, BackupLog } from '../types';
import { supabaseDataService } from '../services/supabaseDataService';

interface MonthlyReportProps {
  user: User;
}

const MonthlyReport: React.FC<MonthlyReportProps> = ({ user }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState<BackupLog[]>([]);
  const [filterPerson, setFilterPerson] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateReport();
  }, [selectedMonth, selectedYear]);

  const generateReport = async () => {
    setLoading(true);
    const data = await supabaseDataService.getMonthlyReport(selectedYear, selectedMonth);
    setReportData(data);
    // Reset filters when changing period
    setFilterPerson('');
    setFilterStatus('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setLoading(false);
  };

  // Get unique person names from report data
  const uniquePersons = Array.from(new Set(reportData.map(log => log.userName))).sort();

  const exportToCSV = () => {
    if (!reportData || reportData.length === 0) return;

    const periodTitle = selectedMonth === -1 ? `Año ${selectedYear}` : `${getMonthName(selectedMonth)} ${selectedYear}`;
    const fileName = selectedMonth === -1 ? `Reporte_Anual_${selectedYear}` : `Reporte_${getMonthName(selectedMonth)}_${selectedYear}`;

    const csvRows = [
      ['Reporte Mensual de Respaldos - Listosoft'],
      [`Período: ${periodTitle}`],
      [`Generado por: ${user.name} ${user.lastName}`],
      [`Fecha de generación: ${new Date().toLocaleString()}`],
      [],
      ['Fecha', 'Hora', 'Persona', 'Respaldo', 'Estado', 'Notas'],
      ...reportData.map((log) => [
        new Date(log.timestamp).toLocaleDateString('es-ES'),
        new Date(log.timestamp).toLocaleTimeString('es-ES'),
        log.userName,
        log.scheduleName,
        getStatusText(log.status),
        log.notes || ''
      ])
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.csv`;
    link.click();
  };

  const getMonthName = (month: number) => {
    if (month === -1) return 'Todo el año';
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[month];
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Exitoso';
      case 'WARNING': return 'Con Novedad';
      case 'FAILED': return 'Fallido';
      default: return status;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">Exitoso</span>;
      case 'WARNING':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">Con Novedad</span>;
      case 'FAILED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">Fallido</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const filteredData = reportData.filter(log => {
    // Filter by person
    if (filterPerson && log.userName !== filterPerson) return false;
    
    // Filter by status
    if (filterStatus && log.status !== filterStatus) return false;
    
    // Filter by date range
    const logDate = new Date(log.timestamp);
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (logDate < fromDate) return false;
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      if (logDate > toDate) return false;
    }
    
    return true;
  });

  const clearFilters = () => {
    setFilterPerson('');
    setFilterStatus('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">
            {selectedMonth === -1 ? 'Reporte Anual' : 'Reporte Mensual'}
          </h2>
          <p className="text-slate-500">Registro detallado de respaldos realizados</p>
        </div>
        
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

      {/* Month/Year Selector & Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        {/* Period Selection */}
        <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <label className="text-sm font-bold text-slate-700">Período:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value={-1}>Todo el año</option>
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
          </div>

          {/* Toggle Filters Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 border border-slate-300 rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros
            {(filterPerson || filterStatus || filterDateFrom || filterDateTo) && (
              <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-bold">
                {[filterPerson, filterStatus, filterDateFrom, filterDateTo].filter(Boolean).length}
              </span>
            )}
            <svg 
              className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Filters - Collapsible */}
        {showFilters && (
          <div className="space-y-3 animate-fadeIn">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold text-slate-700">Aplicar filtros:</span>
              {(filterPerson || filterStatus || filterDateFrom || filterDateTo) && (
                <button
                  onClick={clearFilters}
                  className="ml-2 text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
                >
                  Limpiar todos
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Person Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Persona</label>
                <select
                  value={filterPerson}
                  onChange={(e) => setFilterPerson(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                >
                  <option value="">Todas las personas</option>
                  {uniquePersons.map(person => (
                    <option key={person} value={person}>{person}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Estado</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                >
                  <option value="">Todos los estados</option>
                  <option value="COMPLETED">Exitoso</option>
                  <option value="WARNING">Con Novedad</option>
                  <option value="FAILED">Fallido</option>
                </select>
              </div>

              {/* Date From Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha desde</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              {/* Date To Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha hasta</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b-2 border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Persona</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Respaldo</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No hay registros para el período seleccionado
                  </td>
                </tr>
              ) : (
                filteredData.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-slate-800">
                        {new Date(log.timestamp).toLocaleDateString('es-ES')}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString('es-ES')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">
                      {log.userName}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {log.scheduleName}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                      {log.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer with count */}
        {filteredData.length > 0 && (
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Mostrando <span className="font-bold">{filteredData.length}</span> {filteredData.length === 1 ? 'registro' : 'registros'}
              {(filterPerson || filterStatus || filterDateFrom || filterDateTo) && reportData.length !== filteredData.length && (
                <span> (filtrado de {reportData.length} total{reportData.length !== 1 ? 'es' : ''})</span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyReport;
