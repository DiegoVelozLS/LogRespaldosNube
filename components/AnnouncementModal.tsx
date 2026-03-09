import React, { useState, useEffect } from 'react';
import { Announcement, AnnouncementCategory, AnnouncementPriority, UserRole } from '../types';

interface AnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (announcement: Partial<Announcement>) => void;
    announcement?: Announcement;
    currentUser: { id: string; name: string; lastName: string };
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
    isOpen,
    onClose,
    onSave,
    announcement,
    currentUser
}) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<AnnouncementCategory>(AnnouncementCategory.GENERAL);
    const [priority, setPriority] = useState<AnnouncementPriority>(AnnouncementPriority.NORMAL);
    const [isPinned, setIsPinned] = useState(false);
    const [deadline, setDeadline] = useState('');
    const [visibleRoles, setVisibleRoles] = useState<string[]>([UserRole.ADMIN, UserRole.TECH, UserRole.SUPERVISOR, UserRole.RRHH, UserRole.EMPLOYEE]);

    useEffect(() => {
        if (announcement) {
            setTitle(announcement.title);
            setContent(announcement.content);
            setCategory(announcement.category);
            setPriority(announcement.priority);
            setIsPinned(announcement.isPinned);
            setDeadline(announcement.deadline || '');
            setVisibleRoles(announcement.visibleRoles);
        } else {
            setTitle('');
            setContent('');
            setCategory(AnnouncementCategory.GENERAL);
            setPriority(AnnouncementPriority.NORMAL);
            setIsPinned(false);
            setDeadline('');
            setVisibleRoles([UserRole.ADMIN, UserRole.TECH, UserRole.SUPERVISOR, UserRole.RRHH, UserRole.EMPLOYEE]);
        }
    }, [announcement, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            title,
            content,
            category,
            priority,
            isPinned,
            deadline: deadline || undefined,
            visibleRoles,
            createdBy: currentUser.id,
            createdByName: `${currentUser.name} ${currentUser.lastName}`,
        });
    };

    const toggleRole = (role: string) => {
        setVisibleRoles(prev =>
            prev.includes(role)
                ? prev.filter(r => r !== role)
                : [...prev, role]
        );
    };

    const roles = Object.values(UserRole);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-800">
                        {announcement ? 'Editar Anuncio' : 'Nuevo Anuncio'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700">Título</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            placeholder="Ej: Mantenimiento programado"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700">Categoría</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition"
                            >
                                <option value={AnnouncementCategory.GENERAL}>General</option>
                                <option value={AnnouncementCategory.TECH}>Técnico</option>
                                <option value={AnnouncementCategory.RRHH}>RRHH</option>
                                <option value={AnnouncementCategory.ADMIN}>Administrativo</option>
                                <option value={AnnouncementCategory.URGENT}>Urgente</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700">Prioridad</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition"
                            >
                                <option value={AnnouncementPriority.LOW}>Baja</option>
                                <option value={AnnouncementPriority.NORMAL}>Normal</option>
                                <option value={AnnouncementPriority.HIGH}>Alta</option>
                                <option value={AnnouncementPriority.URGENT}>Urgente</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700">Contenido</label>
                        <textarea
                            required
                            rows={4}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                            placeholder="Describe el anuncio detenidamente..."
                        />
                    </div>

                    <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <label className="text-sm font-semibold text-slate-700">Visibilidad (Roles)</label>
                        <div className="flex flex-wrap gap-2">
                            {roles.map(role => (
                                <button
                                    type="button"
                                    key={role}
                                    onClick={() => toggleRole(role)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${visibleRoles.includes(role)
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                                        : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600'
                                        }`}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-6 px-1">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isPinned"
                                checked={isPinned}
                                onChange={(e) => setIsPinned(e.target.checked)}
                                className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="isPinned" className="text-sm font-medium text-slate-700 cursor-pointer flex items-center gap-1">
                                Fijar <span className="text-blue-500">📌</span>
                            </label>
                        </div>

                        <div className="flex-1 flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                            <div className="flex items-center gap-2 text-slate-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm font-semibold text-slate-700">Vigente hasta:</span>
                            </div>
                            <input
                                type="date"
                                value={deadline ? deadline.split('T')[0] : ''}
                                onChange={(e) => setDeadline(e.target.value)}
                                className="flex-1 bg-transparent border-none text-sm font-medium text-slate-800 focus:outline-none focus:ring-0 p-0"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition"
                        >
                            {announcement ? 'Guardar Cambios' : 'Publicar Anuncio'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AnnouncementModal;
