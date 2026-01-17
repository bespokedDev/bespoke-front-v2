"use client";

import { useEffect, useRef, useMemo, memo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, ListOrdered } from "lucide-react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

function RichTextEditorComponent({
  content,
  onChange,
  placeholder = "Start typing...",
  className,
  minHeight = "120px",
}: RichTextEditorProps) {
  const isInternalUpdate = useRef(false);
  const lastExternalContentRef = useRef<string>(content || "");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn("tiptap focus:outline-none min-h-[120px] text-sm break-words"),
      },
    },
    onUpdate: ({ editor }) => {
      if (!isInternalUpdate.current) {
        onChange(editor.getHTML());
      }
    },
  });

  // Solo sincronizar cuando el contenido externo cambia (no cuando el usuario escribe)
  // Esto evita re-renders innecesarios durante la escritura
  useEffect(() => {
    if (!editor) return;

    // Si el contenido externo cambió y es diferente al que tenemos en el editor,
    // significa que viene de una fuente externa (apertura de modal, reset, etc.)
    if (content !== lastExternalContentRef.current) {
      const currentEditorContent = editor.getHTML();
      
      // Solo actualizar si realmente es diferente
      if (content !== currentEditorContent) {
        isInternalUpdate.current = true;
        editor.commands.setContent(content || "");
        lastExternalContentRef.current = content || "";
        
        // Usar requestAnimationFrame para evitar bloqueos
        requestAnimationFrame(() => {
          isInternalUpdate.current = false;
        });
      } else {
        // Si es igual, solo actualizar el ref
        lastExternalContentRef.current = content || "";
      }
    }
  }, [content, editor]);

  // Memoizar los valores del toolbar para evitar recálculos en cada render
  // Debe estar antes del return condicional para cumplir con las reglas de hooks
  const toolbarButtons = useMemo(() => {
    if (!editor) {
      return {
        isBold: false,
        isItalic: false,
        isBulletList: false,
        isOrderedList: false,
        canBold: false,
        canItalic: false,
      };
    }

    const isBold = editor.isActive("bold");
    const isItalic = editor.isActive("italic");
    const isBulletList = editor.isActive("bulletList");
    const isOrderedList = editor.isActive("orderedList");
    const canBold = editor.can().chain().focus().toggleBold().run();
    const canItalic = editor.can().chain().focus().toggleItalic().run();

    return {
      isBold,
      isItalic,
      isBulletList,
      isOrderedList,
      canBold,
      canItalic,
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  const handleBold = () => editor.chain().focus().toggleBold().run();
  const handleItalic = () => editor.chain().focus().toggleItalic().run();
  const handleBulletList = () => editor.chain().focus().toggleBulletList().run();
  const handleOrderedList = () => editor.chain().focus().toggleOrderedList().run();

  return (
    <div
      className={cn(
        "border-input dark:bg-input/30 rounded-md border bg-transparent shadow-xs",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        "w-full max-w-full box-border",
        className
      )}
      style={{ minHeight }}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5 flex-wrap shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleBold}
          disabled={!toolbarButtons.canBold}
          data-active={toolbarButtons.isBold ? "true" : undefined}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleItalic}
          disabled={!toolbarButtons.canItalic}
          data-active={toolbarButtons.isItalic ? "true" : undefined}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <div className="h-4 w-px bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleBulletList}
          data-active={toolbarButtons.isBulletList ? "true" : undefined}
          aria-label="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleOrderedList}
          data-active={toolbarButtons.isOrderedList ? "true" : undefined}
          aria-label="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>
      {/* Editor Content */}
      <div className="px-3 py-2 overflow-x-hidden overflow-y-auto w-full max-w-full box-border">
        <div className="w-full max-w-full">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

// Memoizar el componente para evitar re-renders innecesarios
export const RichTextEditor = memo(RichTextEditorComponent);
