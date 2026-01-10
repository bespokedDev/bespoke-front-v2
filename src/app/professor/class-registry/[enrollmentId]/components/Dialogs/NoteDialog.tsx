"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ClassRegistry } from "../../types";

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registryId: string | null;
  classRegistries: ClassRegistry[];
  noteData: {
    content: string;
    visible: {
      admin: boolean;
      student: boolean;
      professor: boolean;
    };
  };
  onNoteDataChange: (data: {
    content: string;
    visible: {
      admin: boolean;
      student: boolean;
      professor: boolean;
    };
  }) => void;
  onSave: (registryId: string, noteObject: {
    content: string | null;
    visible: {
      admin: number;
      student: number;
      professor: number;
    };
  }) => Promise<void>;
}

export const NoteDialog = ({
  open,
  onOpenChange,
  registryId,
  classRegistries,
  onNoteDataChange,
  onSave,
}: NoteDialogProps) => {
  // Estado local para el contenido - solo se actualiza cuando se guarda o se abre el modal
  const [localContent, setLocalContent] = useState<string>("");
  const [localVisible, setLocalVisible] = useState<{
    admin: boolean;
    student: boolean;
    professor: boolean;
  }>({
    admin: true,
    student: false,
    professor: true,
  });

  // Sincronizar estado local cuando se abre el modal o cambia el registryId
  useEffect(() => {
    if (open && registryId) {
      const registry = classRegistries.find(r => r._id === registryId);
      const existingContent = registry?.note?.content || "";
      const existingVisible = registry?.note?.visible || {
        admin: 1,
        student: 0,
        professor: 1,
      };

      setLocalContent(existingContent);
      setLocalVisible({
        admin: existingVisible.admin === 1,
        student: existingVisible.student === 1,
        professor: existingVisible.professor === 1,
      });
    }
  }, [open, registryId, classRegistries]);

  const handleClose = useCallback(() => {
    setLocalContent("");
    setLocalVisible({
      admin: true,
      student: false,
      professor: true,
    });
    onNoteDataChange({
      content: "",
      visible: {
        admin: true,
        student: false,
        professor: true,
      },
    });
    onOpenChange(false);
  }, [onOpenChange, onNoteDataChange]);

  const handleSave = useCallback(async () => {
    if (!registryId) return;
    
    const noteObject = {
      content: localContent.trim() || null,
      visible: {
        admin: 1, // Always visible to admin
        student: localVisible.student ? 1 : 0,
        professor: 1, // Always visible to professor
      },
    };

    await onSave(registryId, noteObject);
    handleClose();
  }, [registryId, localContent, localVisible, onSave, handleClose]);

  const handleContentChange = useCallback((newContent: string) => {
    setLocalContent(newContent);
  }, []);

  const handleVisibleChange = useCallback((field: "student", checked: boolean) => {
    setLocalVisible((prev) => ({
      ...prev,
      [field]: checked,
    }));
  }, []);

  const registry = classRegistries.find(r => r._id === registryId);
  const isEditing = registry?.note?.content;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Note" : "Add Note"}
          </DialogTitle>
          <DialogDescription>
            Add or edit a note for this class registry entry. Select who can see this note.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="note-content">Note Content</Label>
            <div className="max-w-full">
              <RichTextEditor
                content={localContent}
                onChange={handleContentChange}
                placeholder="Enter note content..."
                minHeight="120px"
                className="w-full"
              />
            </div>
          </div>
          <div className="space-y-3">
            <Label>Visibility</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="visible-admin"
                  checked={true}
                  disabled={true}
                  readOnly={true}
                  className="rounded"
                />
                <Label htmlFor="visible-admin" className="font-normal cursor-pointer">
                  Visible to Admin
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="visible-student"
                  checked={localVisible.student}
                  onChange={(e) => handleVisibleChange("student", e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="visible-student" className="font-normal cursor-pointer">
                  Visible to Student
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="visible-professor"
                  checked={true}
                  disabled={true}
                  readOnly={true}
                  className="rounded"
                />
                <Label htmlFor="visible-professor" className="font-normal cursor-pointer">
                  Visible to Professor
                </Label>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

