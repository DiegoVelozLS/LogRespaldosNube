import React, { useState, useEffect } from 'react';
import { User, Employee, UserRole } from '../types';
import { supabaseDataService } from '../services/supabaseDataService';

// Departamentos fijos con colores institucionales
const DEPARTMENTS: { name: string; color: string }[] = [
  { name: 'Innovación', color: '#7C3AED' }, // morado
  { name: 'Soporte', color: '#166534' }, // verde oscuro
  { name: 'Desarrollo', color: '#38BDF8' }, // celeste
  { name: 'Administración', color: '#F97316' }, // naranja
  { name: 'Contabilidad externa', color: '#94A3B8' }, // gris
  { name: 'Servicios generales', color: '#67E8F9' }, // gris celeste
  { name: 'Talento Humano', color: '#CA8A04' }, // dorado sobrio
  { name: 'Gerencia', color: '#1E3A5F' }, // azul oscuro formal
];

const DEPARTMENT_COLOR_MAP: Record<string, string> = Object.fromEntries(
  DEPARTMENTS.map(d => [d.name, d.color])
);

interface EmployeeDirectoryProps {
  user: User;
}

const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({ user }) => {
  // Solo ADMIN puede crear/editar/eliminar empleados
  const isAdmin = user.role === UserRole.ADMIN;
  const canCreate = isAdmin;
  const canEdit = isAdmin;
  const canDelete = isAdmin;

  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [isEditingEmployee, setIsEditingEmployee] = useState(false);
  const [isDeletingEmployee, setIsDeletingEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
    name: '',
    lastName: '',
    email: '',
    department: '',
    position: '',
    phone: '',
    extension: '',
    role: 'SOPORTE'
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setIsLoading(true);
    const data = await supabaseDataService.getEmployees();
    setEmployees(data);
    setIsLoading(false);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.lastName || !newEmployee.email || !newEmployee.department || !newEmployee.position) return;

    // Check if roles have permissions
    const created = await supabaseDataService.saveEmployee(newEmployee as Employee);
    if (created) {
      setEmployees(prev => [...prev, created].sort((a, b) => (a.name + a.lastName).localeCompare(b.name + b.lastName)));
      setIsCreatingEmployee(false);
      setNewEmployee({ name: '', lastName: '', email: '', department: '', position: '', phone: '', extension: '', role: 'SOPORTE' });
    } else {
      alert("Hubo un error al crear el empleado.");
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    if (!newEmployee.name || !newEmployee.lastName || !newEmployee.email || !newEmployee.department || !newEmployee.position) return;

    const updated = await supabaseDataService.updateEmployee(selectedEmployee.id, newEmployee);
    if (updated) {
      setEmployees(prev => prev.map(emp => emp.id === selectedEmployee.id ? { ...emp, ...newEmployee } as Employee : emp));
      setSelectedEmployee({ ...selectedEmployee, ...newEmployee } as Employee);
      setIsEditingEmployee(false);
    } else {
      alert("Hubo un error al actualizar el empleado.");
    }
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;

    const result = await supabaseDataService.deleteEmployee(selectedEmployee.id);
    if (result.success) {
      setEmployees(prev => prev.filter(emp => emp.id !== selectedEmployee.id));
      setSelectedEmployee(null);
      setIsDeletingEmployee(false);
    } else {
      alert(`Error al eliminar el empleado: ${result.error || 'Error desconocido'}\n\nVerifica que tengas permisos de Admin o RRHH.`);
    }
  };

  const startEditing = () => {
    if (!selectedEmployee) return;
    setNewEmployee({
      name: selectedEmployee.name,
      lastName: selectedEmployee.lastName,
      email: selectedEmployee.email,
      department: selectedEmployee.department,
      position: selectedEmployee.position,
      phone: selectedEmployee.phone || '',
      extension: selectedEmployee.extension || '',
      birthday: selectedEmployee.birthday || '',
      hireDate: selectedEmployee.hireDate || '',
      role: selectedEmployee.role
    });
    setIsEditingEmployee(true);
  };

  // Lista fija de departamentos para filtros
  const departmentsList: string[] = DEPARTMENTS.map(d => d.name);

  // Filtrar empleados
  const filteredEmployees = employees
    .filter(emp => !selectedDepartment || emp.department === selectedDepartment)
    .filter(emp =>
      (emp.name + ' ' + emp.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.department || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => (a.name + a.lastName).localeCompare(b.name + b.lastName));

  const getDepartmentColor = (department: string = '') =>
    DEPARTMENT_COLOR_MAP[department] ?? '#64748b';

  const getInitials = (name: string, lastName: string) => {
    return `${name.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    // Evitar problema de timezone: parsear la fecha manualmente
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // mes es 0-indexed
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN': return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">Admin</span>;
      case 'TECH': return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">Técnico</span>;
      case 'SOPORTE': return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">Soporte</span>;
      default: return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700">{role}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>👥</span> Directorio de Empleados
          </h1>
          <p className="text-slate-500 mt-1">
            Contactos y información del equipo Listosoft
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            {employees.length} colaboradores
          </span>
          {canCreate && (
            <button
              onClick={() => setIsCreatingEmployee(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Empleado
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>

          {/* Departamentos */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedDepartment(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${selectedDepartment === null
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                }`}
            >
              Todos
            </button>
            {departmentsList.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 ${selectedDepartment === dept
                  ? 'text-white'
                  : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                  }`}
                style={{
                  backgroundColor: selectedDepartment === dept ? getDepartmentColor(dept) : undefined
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: selectedDepartment === dept ? 'white' : getDepartmentColor(dept) }}
                />
                {dept}
              </button>
            ))}
          </div>

          {/* Barra de búsqueda y vista */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 relative w-full sm:w-auto">
              <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por nombre, cargo, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Lista de empleados */}
          {filteredEmployees.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
              <svg className="w-16 h-16 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No se encontraron empleados</h3>
              <p className="text-slate-500">
                Intenta con otra búsqueda o selecciona otro departamento.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  onClick={() => setSelectedEmployee(employee)}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition cursor-pointer overflow-hidden"
                >
                  {/* Header con color del departamento */}
                  <div
                    className="h-20 flex items-end justify-center pb-6 relative"
                    style={{ backgroundColor: getDepartmentColor(String(employee.department)) }}
                  >
                    <div className="absolute -bottom-8 w-16 h-16 bg-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg border-4 border-white"
                      style={{ color: getDepartmentColor(String(employee.department)) }}
                    >
                      {employee.photoUrl ? (
                        <img src={employee.photoUrl} alt={employee.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        getInitials(employee.name, employee.lastName)
                      )}
                    </div>
                  </div>

                  <div className="pt-10 pb-4 px-4 text-center">
                    <h3 className="font-semibold text-slate-800">
                      {employee.name} {employee.lastName}
                    </h3>
                    <p className="text-sm text-slate-500 mb-2">{employee.position}</p>
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getDepartmentColor(String(employee.department)) }}
                      />
                      <span className="text-xs text-slate-500">{employee.department}</span>
                    </div>

                    <div className="flex items-center justify-center gap-2">
                      <a
                        href={`mailto:${employee.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition"
                        title="Enviar correo"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </a>
                      {employee.phone && (
                        <a
                          href={`tel:${employee.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-full transition"
                          title="Llamar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </a>
                      )}
                      {canEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmployee(employee);
                            startEditing();
                          }}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-full transition"
                          title="Editar empleado"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmployee(employee);
                            setIsDeletingEmployee(true);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-full transition"
                          title="Eliminar empleado"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Vista de lista */
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Empleado</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden md:table-cell">Departamento</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden lg:table-cell">Contacto</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden xl:table-cell">Extensión</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee, index) => (
                    <tr
                      key={employee.id}
                      onClick={() => setSelectedEmployee(employee)}
                      className={`hover:bg-slate-50 transition cursor-pointer ${index !== filteredEmployees.length - 1 ? 'border-b border-slate-100' : ''
                        }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm"
                            style={{ backgroundColor: getDepartmentColor(String(employee.department)) }}
                          >
                            {getInitials(employee.name, employee.lastName)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">
                              {employee.name} {employee.lastName}
                            </p>
                            <p className="text-sm text-slate-500">{employee.position}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getDepartmentColor(String(employee.department)) }}
                          />
                          <span className="text-sm text-slate-600">{employee.department}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="space-y-1">
                          <p className="text-sm text-slate-600">{employee.email}</p>
                          {employee.phone && (
                            <p className="text-sm text-slate-500">{employee.phone}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <span className="text-sm text-slate-600">
                          {employee.extension ? `Ext. ${employee.extension}` : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={`mailto:${employee.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Enviar correo"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </a>
                          {employee.phone && (
                            <a
                              href={`tel:${employee.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                              title="Llamar"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </a>
                          )}
                          {canEdit && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEmployee(employee);
                                startEditing();
                              }}
                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title="Editar empleado"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEmployee(employee);
                                setIsDeletingEmployee(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Eliminar empleado"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal de detalle de empleado */}
          {selectedEmployee && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedEmployee(null)}>
              <div
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header con color */}
                <div
                  className="h-24 relative"
                  style={{ backgroundColor: getDepartmentColor(String(selectedEmployee.department)) }}
                >
                  <button
                    onClick={() => setSelectedEmployee(null)}
                    className="absolute top-3 right-3 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg border-4 border-white"
                    style={{ color: getDepartmentColor(String(selectedEmployee.department)) }}
                  >
                    {selectedEmployee.photoUrl ? (
                      <img src={selectedEmployee.photoUrl} alt={selectedEmployee.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      getInitials(selectedEmployee.name, selectedEmployee.lastName)
                    )}
                  </div>
                </div>

                <div className="pt-14 pb-4 px-5">
                  <div className="text-center mb-4">
                    <h2 className="text-xl font-bold text-slate-800">
                      {selectedEmployee.name} {selectedEmployee.lastName}
                    </h2>
                    <p className="text-slate-500">{selectedEmployee.position}</p>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      {getRoleBadge(selectedEmployee.role)}
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                    <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Departamento</p>
                        <p className="font-medium text-sm text-slate-800">{selectedEmployee.department}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Email</p>
                        <a href={`mailto:${selectedEmployee.email}`} className="font-medium text-sm text-blue-600 hover:underline">
                          {selectedEmployee.email}
                        </a>
                      </div>
                    </div>

                    {selectedEmployee.phone && (
                      <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Teléfono {selectedEmployee.extension && `(Ext. ${selectedEmployee.extension})`}</p>
                          <a href={`tel:${selectedEmployee.phone}`} className="font-medium text-sm text-slate-800">
                            {selectedEmployee.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {selectedEmployee.birthday && (
                      <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
                        <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                          <span className="text-base">🎂</span>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Cumpleaños</p>
                          <p className="font-medium text-sm text-slate-800">{formatDate(selectedEmployee.birthday)}</p>
                        </div>
                      </div>
                    )}

                    {selectedEmployee.hireDate && (
                      <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
                        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                          <span className="text-base">📅</span>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Fecha Ingreso</p>
                          <p className="font-medium text-sm text-slate-800">{formatDate(selectedEmployee.hireDate)}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <a
                      href={`mailto:${selectedEmployee.email}`}
                      className="flex-1 py-1.5 bg-blue-600 text-white text-sm text-center font-medium rounded-lg hover:bg-blue-700 transition"
                    >
                      Email
                    </a>
                    {selectedEmployee.phone && (
                      <a
                        href={`tel:${selectedEmployee.phone}`}
                        className="flex-1 py-1.5 bg-green-600 text-white text-sm text-center font-medium rounded-lg hover:bg-green-700 transition"
                      >
                        Llamar
                      </a>
                    )}
                  </div>

                  {(canEdit || canDelete) && (
                    <div className="flex justify-center gap-2 mt-3 pt-3 border-t border-slate-100">
                      {canEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing();
                        }}
                        className="flex-1 py-1.5 text-blue-600 bg-blue-50 text-sm font-medium rounded-lg hover:bg-blue-100 transition flex items-center justify-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Editar
                      </button>
                      )}
                      {canDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDeletingEmployee(true);
                        }}
                        className="flex-1 py-1.5 text-red-600 bg-red-50 text-sm font-medium rounded-lg hover:bg-red-100 transition flex items-center justify-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Eliminar
                      </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Modal de Confirmación de Eliminación */}
          {isDeletingEmployee && selectedEmployee && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsDeletingEmployee(false)}>
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar empleado?</h3>
                  <p className="text-slate-500 mb-6">
                    ¿Estás seguro de que deseas eliminar a <strong>{selectedEmployee.name} {selectedEmployee.lastName}</strong>? Esta acción no se puede deshacer.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsDeletingEmployee(false)}
                      className="flex-1 py-2.5 px-4 text-slate-700 bg-slate-100 font-medium rounded-lg hover:bg-slate-200 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleDeleteEmployee}
                      className="flex-1 py-2.5 px-4 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition"
                    >
                      Sí, eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Crear/Editar Empleado */}
          {(isCreatingEmployee || isEditingEmployee) && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => {
              setIsCreatingEmployee(false);
              setIsEditingEmployee(false);
              setNewEmployee({ name: '', lastName: '', email: '', department: '', position: '', phone: '', extension: '', role: 'SOPORTE' });
            }}>
              <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-800">{isEditingEmployee ? 'Editar Empleado' : 'Crear Nuevo Empleado'}</h2>
                  <button
                    onClick={() => {
                      setIsCreatingEmployee(false);
                      setIsEditingEmployee(false);
                      setNewEmployee({ name: '', lastName: '', email: '', department: '', position: '', phone: '', extension: '', role: 'SOPORTE' });
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={isEditingEmployee ? handleUpdateEmployee : handleCreateEmployee} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                      <input
                        type="text"
                        required
                        value={newEmployee.name}
                        onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Apellidos *</label>
                      <input
                        type="text"
                        required
                        value={newEmployee.lastName}
                        onChange={(e) => setNewEmployee({ ...newEmployee, lastName: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Departamento *</label>
                      <select
                        required
                        value={newEmployee.department}
                        onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-700 bg-white"
                      >
                        <option value="" disabled>Seleccionar departamento...</option>
                        {DEPARTMENTS.map(d => (
                          <option key={d.name} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Cargo *</label>
                      <input
                        type="text"
                        required
                        value={newEmployee.position}
                        onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                      <input
                        type="tel"
                        value={newEmployee.phone}
                        onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Extensión</label>
                      <input
                        type="text"
                        value={newEmployee.extension}
                        onChange={(e) => setNewEmployee({ ...newEmployee, extension: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Nacimiento</label>
                      <input
                        type="date"
                        value={newEmployee.birthday}
                        onChange={(e) => setNewEmployee({ ...newEmployee, birthday: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Ingreso</label>
                      <input
                        type="date"
                        value={newEmployee.hireDate}
                        onChange={(e) => setNewEmployee({ ...newEmployee, hireDate: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                    <button
                      type="button"
                      onClick={() => setIsCreatingEmployee(false)}
                      className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                    >
                      Guardar Empleado
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EmployeeDirectory;
