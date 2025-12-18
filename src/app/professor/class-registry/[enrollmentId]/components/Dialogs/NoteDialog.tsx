"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  noteData,
  onNoteDataChange,
  onSave,
}: NoteDialogProps) => {
  const handleClose = () => {
    onNoteDataChange({
      content: "",
      visible: {
        admin: true,
        student: false,
        professor: true, // Always true for professor
      },
    });
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!registryId) return;
    
    const noteObject = {
      content: noteData.content.trim() || null,
      visible: {
        admin: 1, // Always visible to admin
        student: noteData.visible.student ? 1 : 0,
        professor: 1, // Always visible to professor
      },
    };

    await onSave(registryId, noteObject);
    handleClose();
  };

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
            <Textarea
              id="note-content"
              value={noteData.content}
              onChange={(e) =>
                onNoteDataChange({
                  ...noteData,
                  content: e.target.value,
                })
              }
              placeholder="Enter note content..."
              className="min-h-[120px]"
            />
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
                  checked={noteData.visible.student}
                  onChange={(e) =>
                    onNoteDataChange({
                      ...noteData,
                      visible: {
                        ...noteData.visible,
                        student: e.target.checked,
                      },
                    })
                  }
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

