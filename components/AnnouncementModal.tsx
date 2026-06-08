import React, { useState, useEffect } from 'react';
import { Announcement, AnnouncementCategory, AnnouncementPriority, UserRole, User, AnnouncementNotification } from '../types';
import { supabaseDataService } from '../services/supabaseDataService';

interface AnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (announcement: Partial<Announcement>, notification?: AnnouncementNotification) => void;
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

    // Estados para notificación por correo
    const [notifyByEmail, setNotifyByEmail] = useState(false);
    const [recipientType, setRecipientType] = useState<'ALL' | 'SPECIFIC'>('ALL');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(false);

    const allRoles = Object.values(UserRole);

    const getPlainTextContent = (value: string) => {
        if (!value) return '';

        const parser = new DOMParser();
        return parser.parseFromString(value, 'text/html').body.textContent || value;
    };

    useEffect(() => {
        if (announcement) {
            setTitle(announcement.title);
            setContent(getPlainTextContent(announcement.content));
            setCategory(announcement.category);
            setPriority(announcement.priority);
            setIsPinned(announcement.isPinned);
            setDeadline(announcement.deadline || '');
            setNotifyByEmail(false); // Por defecto no notificar al editar a menos que se marque explícitamente
        } else {
            setTitle('');
            setContent('');
            setCategory(AnnouncementCategory.GENERAL);
            setPriority(AnnouncementPriority.NORMAL);
            setIsPinned(false);
            setDeadline('');
            setNotifyByEmail(false);
        }
    }, [announcement, isOpen]);

    useEffect(() => {
        if (isOpen && recipientType === 'SPECIFIC' && availableUsers.length === 0) {
            fetchUsers();
        }
    }, [isOpen, recipientType]);

    const fetchUsers = async () => {
        setLoadingUsers(true);
        const users = await supabaseDataService.getUsers();
        setAvailableUsers(users);
        setLoadingUsers(false);
    };

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const notification: AnnouncementNotification | undefined = notifyByEmail ? {
            notifyByEmail,
            recipientType,
            selectedUserIds: recipientType === 'ALL' ? [] : selectedUserIds
        } : undefined;

        onSave({
            title,
            content,
            category,
            priority,
            isPinned,
            deadline: deadline || undefined,
            visibleRoles: allRoles,
            createdBy: currentUser.id,
            createdByName: `${currentUser.name} ${currentUser.lastName}`,
        }, notification);
    };

    const toggleUserSelection = (userId: string) => {
        setSelectedUserIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const filteredUsers = availableUsers.filter(u =>
        u.id !== currentUser.id && // No enviarse a sí mismo
        (`${u.name} ${u.lastName} ${u.email}`).toLowerCase().includes(userSearchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
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

                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
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

                    <div className="flex flex-col gap-4 border-t border-slate-100 pt-4">
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
                                    required
                                    value={deadline ? deadline.split('T')[0] : ''}
                                    onChange={(e) => setDeadline(e.target.value)}
                                    className="flex-1 bg-transparent border-none text-sm font-medium text-slate-800 focus:outline-none focus:ring-0 p-0"
                                />
                            </div>
                        </div>

                        {/* Sección de Notificación por Correo */}
                        <div className="hidden bg-blue-50/50 rounded-2xl p-4 border border-blue-100 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-blue-800 font-semibold">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span>Notificar por correo electrónico</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={notifyByEmail}
                                        onChange={(e) => setNotifyByEmail(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {notifyByEmail && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                                name="recipientType"
                                                checked={recipientType === 'ALL'}
                                                onChange={() => setRecipientType('ALL')}
                                            />
                                            <span className="text-sm font-medium text-slate-700">A todos los usuarios</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                                name="recipientType"
                                                checked={recipientType === 'SPECIFIC'}
                                                onChange={() => setRecipientType('SPECIFIC')}
                                            />
                                            <span className="text-sm font-medium text-slate-700">Seleccionar específicos</span>
                                        </label>
                                    </div>

                                    {recipientType === 'SPECIFIC' && (
                                        <div className="space-y-2 border-t border-blue-100 pt-3">
                                            <input
                                                type="text"
                                                placeholder="Buscar usuario..."
                                                value={userSearchTerm}
                                                onChange={(e) => setUserSearchTerm(e.target.value)}
                                                className="w-full px-3 py-1.5 text-sm bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                                            />
                                            <div className="max-h-40 overflow-y-auto bg-white rounded-lg border border-blue-200 divide-y divide-slate-50">
                                                {loadingUsers ? (
                                                    <div className="p-4 text-center text-slate-400 text-sm italic">Cargando usuarios...</div>
                                                ) : filteredUsers.length === 0 ? (
                                                    <div className="p-4 text-center text-slate-400 text-sm">No se encontraron usuarios</div>
                                                ) : (
                                                    filteredUsers.map(user => (
                                                        <div
                                                            key={user.id}
                                                            className="flex items-center gap-3 p-2 hover:bg-slate-50 transition cursor-pointer"
                                                            onClick={() => toggleUserSelection(user.id)}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedUserIds.includes(user.id)}
                                                                onChange={() => { }} // Manejado por el div parent
                                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                            />
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium text-slate-700">{user.name} {user.lastName}</span>
                                                                <span className="text-xs text-slate-500">{user.email}</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-500 px-1 italic">
                                                {selectedUserIds.length} usuarios seleccionados
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 sticky bottom-0 bg-white">
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
