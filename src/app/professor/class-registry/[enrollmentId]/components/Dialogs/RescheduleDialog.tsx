"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registryId: string | null;
  rescheduleDate: string;
  onRescheduleDateChange: (date: string) => void;
  onCreateReschedule: (registryId: string, classDate: string) => Promise<void>;
  isCreating: boolean;
  errorMessage: string | null;
}

export const RescheduleDialog = ({
  open,
  onOpenChange,
  registryId,
  rescheduleDate,
  onRescheduleDateChange,
  onCreateReschedule,
  isCreating,
  errorMessage,
}: RescheduleDialogProps) => {
  const handleClose = () => {
    onRescheduleDateChange("");
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!registryId || !rescheduleDate) {
      // Error message will be handled by parent component
      return;
    }
    await onCreateReschedule(registryId, rescheduleDate);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Reschedule</DialogTitle>
          <DialogDescription>
            Enter the date for the rescheduled class. The original class will be marked as rescheduled.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
              <span>{errorMessage}</span>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="reschedule-date">Reschedule Date *</Label>
            <Input
              id="reschedule-date"
              type="date"
              value={rescheduleDate}
              onChange={(e) => onRescheduleDateChange(e.target.value)}
              required
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isCreating || !rescheduleDate}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Reschedule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

