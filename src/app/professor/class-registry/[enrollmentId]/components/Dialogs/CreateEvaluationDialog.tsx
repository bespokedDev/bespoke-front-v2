"use client";

import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { convertToDDMMYYYY } from "@/lib/dateUtils";
import { convertImageToBase64 } from "../../utils/imageUtils";
import type { ClassRegistry } from "../../types";

interface EvaluationFormData {
  fecha: string;
  temasEvaluados: string;
  skillEvaluada: string;
  linkMaterial: string;
  capturePrueba: string | null;
  puntuacion: string;
  comentario: string;
}

interface CreateEvaluationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClassRegistry: ClassRegistry | null;
  formData: EvaluationFormData;
  onFormDataChange: (data: EvaluationFormData) => void;
  error: string | null;
  onErrorChange: (error: string | null) => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
}

export const CreateEvaluationDialog = ({
  open,
  onOpenChange,
  selectedClassRegistry,
  formData,
  onFormDataChange,
  error,
  onErrorChange,
  onSubmit,
  isSubmitting,
}: CreateEvaluationDialogProps) => {
  const handleClose = () => {
    onFormDataChange({
      fecha: new Date().toISOString().split("T")[0],
      temasEvaluados: "",
      skillEvaluada: "",
      linkMaterial: "",
      capturePrueba: null,
      puntuacion: "",
      comentario: "",
    });
    onErrorChange(null);
    onOpenChange(false);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await convertImageToBase64(file);
        onFormDataChange({
          ...formData,
          capturePrueba: base64,
        });
      } catch (err) {
        console.error("Error converting image:", err);
        onErrorChange("Error converting image. Please try with another image.");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Evaluation</DialogTitle>
          <DialogDescription>
            Fill in the fields to create a new evaluation for this class.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="space-y-4 py-4">
          {selectedClassRegistry && (
            <div className="space-y-2">
              <Label>Evaluation Date</Label>
              <Input
                type="text"
                value={convertToDDMMYYYY(selectedClassRegistry.classDate)}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                The evaluation date matches the class date automatically
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="skill-evaluada">Evaluated Skill</Label>
            <Input
              id="skill-evaluada"
              value={formData.skillEvaluada}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  skillEvaluada: e.target.value,
                })
              }
              placeholder="Evaluated skill"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="temas-evaluados">Evaluated Topics</Label>
            <Textarea
              id="temas-evaluados"
              value={formData.temasEvaluados}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  temasEvaluados: e.target.value,
                })
              }
              placeholder="Evaluated topics"
              className="min-h-[80px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="puntuacion">Score</Label>
            <Input
              id="puntuacion"
              value={formData.puntuacion}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  puntuacion: e.target.value,
                })
              }
              placeholder="Score"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comentario">Comment</Label>
            <Textarea
              id="comentario"
              value={formData.comentario}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  comentario: e.target.value,
                })
              }
              placeholder="Comment"
              className="min-h-[100px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="link-material">Link Material</Label>
            <Input
              id="link-material"
              type="url"
              value={formData.linkMaterial}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  linkMaterial: e.target.value,
                })
              }
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="capture-prueba">Test Screenshot</Label>
            <Input
              id="capture-prueba"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            {formData.capturePrueba && (
              <div className="mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={formData.capturePrueba}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded border"
                />
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Evaluation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

