import React, { useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = 'Describe el anuncio detenidamente...'
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline font-medium cursor-pointer',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'rich-text-content px-4 py-3 min-h-[160px] max-h-[340px] overflow-y-auto focus:outline-none text-slate-700 text-sm leading-relaxed bg-white',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const currentHTML = editor.getHTML();
    if (content !== currentHTML) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Ingresa la URL del enlace:', previousUrl || 'https://');

    if (url === null) {
      return;
    }

    if (url === '' || url === 'https://') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl animate-pulse flex items-center justify-center text-xs text-slate-400">
        Cargando editor...
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl bg-slate-50 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition shadow-xs">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-100/90 border-b border-slate-200 text-slate-700">
        {/* Encabezados */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1 text-xs font-bold rounded hover:bg-white transition ${
            editor.isActive('heading', { level: 2 }) ? 'bg-white text-blue-600 shadow-xs' : ''
          }`}
          title="Título principal (H2)"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2 py-1 text-xs font-bold rounded hover:bg-white transition ${
            editor.isActive('heading', { level: 3 }) ? 'bg-white text-blue-600 shadow-xs' : ''
          }`}
          title="Subtítulo (H3)"
        >
          H3
        </button>

        <span className="w-px h-4 bg-slate-300 mx-1" />

        {/* Formatos básicos */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2 py-1 text-xs font-bold rounded hover:bg-white transition ${
            editor.isActive('bold') ? 'bg-white text-blue-600 shadow-xs' : ''
          }`}
          title="Negrita (Ctrl+B)"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 text-xs italic font-semibold rounded hover:bg-white transition ${
            editor.isActive('italic') ? 'bg-white text-blue-600 shadow-xs' : ''
          }`}
          title="Cursiva (Ctrl+I)"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`px-2 py-1 text-xs line-through rounded hover:bg-white transition ${
            editor.isActive('strike') ? 'bg-white text-blue-600 shadow-xs' : ''
          }`}
          title="Tachado"
        >
          S
        </button>

        <span className="w-px h-4 bg-slate-300 mx-1" />

        {/* Listas */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-white transition ${
            editor.isActive('bulletList') ? 'bg-white text-blue-600 shadow-xs' : ''
          }`}
          title="Lista con viñetas"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16M2 6h.01M2 12h.01M2 18h.01" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded hover:bg-white transition ${
            editor.isActive('orderedList') ? 'bg-white text-blue-600 shadow-xs' : ''
          }`}
          title="Lista numerada"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h14M7 12h14M7 18h14M3 5v3m0-1.5h1.5M3 12h1.5a1 1 0 011 1v1a1 1 0 01-1 1H3m0 3h2.5" />
          </svg>
        </button>

        <span className="w-px h-4 bg-slate-300 mx-1" />

        {/* Cita */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded hover:bg-white transition ${
            editor.isActive('blockquote') ? 'bg-white text-blue-600 shadow-xs' : ''
          }`}
          title="Cita destacada"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>

        {/* Separador */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-1.5 rounded hover:bg-white transition"
          title="Línea horizontal divisoria"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          </svg>
        </button>

        {/* Enlace */}
        <button
          type="button"
          onClick={setLink}
          className={`p-1.5 rounded hover:bg-white transition ${
            editor.isActive('link') ? 'bg-white text-blue-600 shadow-xs' : ''
          }`}
          title="Insertar o editar enlace"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded hover:bg-white transition disabled:opacity-30 disabled:hover:bg-transparent"
            title="Deshacer (Ctrl+Z)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded hover:bg-white transition disabled:opacity-30 disabled:hover:bg-transparent"
            title="Rehacer (Ctrl+Y)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <EditorContent editor={editor} />
    </div>
  );
};
