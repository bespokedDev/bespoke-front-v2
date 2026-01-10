"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { SubstituteProfessor, ProfessorBrief } from "../types/enrollment.types";
import { getCurrentDateString } from "@/lib/dateUtils";
import { addDaysToDate } from "@/lib/dateUtils";

interface SubstituteProfessorSectionProps {
  substituteProfessor: SubstituteProfessor | null;
  professors: ProfessorBrief[];
  mainProfessorId?: string;
  onUpdate: (substitute: SubstituteProfessor | null) => void;
}

export function SubstituteProfessorSection({
  substituteProfessor,
  professors,
  mainProfessorId,
  onUpdate,
}: SubstituteProfessorSectionProps) {
  const availableProfessors = professors.filter(
    (p) => p._id !== mainProfessorId
  );

  const handleSelectProfessor = (professorId: string) => {
    const currentDate = getCurrentDateString();
    onUpdate({
      professorId,
      status: 1,
      assignedDate: currentDate,
      expiryDate: addDaysToDate(currentDate, 3),
    });
  };

  const handleAssignedDateChange = (date: string) => {
    if (!substituteProfessor) return;
    onUpdate({
      ...substituteProfessor,
      assignedDate: date,
      expiryDate: addDaysToDate(date, 3),
    });
  };

  const handleExpiryDateChange = (date: string) => {
    if (!substituteProfessor) return;
    onUpdate({
      ...substituteProfessor,
      expiryDate: date,
    });
  };

  return (
    <div className="space-y-4 p-4 border rounded-md">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Substitute Professor</Label>
        {substituteProfessor && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onUpdate(null)}
            className="text-destructive hover:opacity-80"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Remove
          </Button>
        )}
      </div>
      {substituteProfessor ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Professor</Label>
            <Select
              value={substituteProfessor.professorId}
              onValueChange={handleSelectProfessor}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select substitute professor..." />
              </SelectTrigger>
              <SelectContent>
                {availableProfessors.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Assigned Date</Label>
            <Input
              type="date"
              max="9999-12-31"
              value={substituteProfessor.assignedDate}
              onChange={(e) => handleAssignedDateChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Expiry Date</Label>
            <Input
              type="date"
              max="9999-12-31"
              value={substituteProfessor.expiryDate}
              onChange={(e) => handleExpiryDateChange(e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Select value="" onValueChange={handleSelectProfessor}>
            <SelectTrigger>
              <SelectValue placeholder="Select substitute professor..." />
            </SelectTrigger>
            <SelectContent>
              {availableProfessors.map((p) => (
                <SelectItem key={p._id} value={p._id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

