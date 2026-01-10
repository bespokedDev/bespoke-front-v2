"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { ChevronsUpDown, X } from "lucide-react";
import type { StudentEnrollmentFormData } from "../types/enrollment.types";

interface StudentMultiSelectProps {
  items: { _id: string; name: string }[];
  selectedStudents: StudentEnrollmentFormData[];
  onSelectedChange: (students: StudentEnrollmentFormData[]) => void;
  placeholder: string;
}

export function StudentMultiSelect({
  items,
  selectedStudents,
  onSelectedChange,
  placeholder,
}: StudentMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (id: string) => {
    const isSelected = selectedStudents.some((s) => s.studentId === id);
    let newSelectedStudents: StudentEnrollmentFormData[];

    if (isSelected) {
      // Remover estudiante
      newSelectedStudents = selectedStudents.filter(
        (s) => s.studentId !== id
      );
    } else {
      // Agregar estudiante con objeto inicializado
      newSelectedStudents = [
        ...selectedStudents,
        {
          studentId: id,
          preferences: "",
          firstTimeLearningLanguage: "",
          previousExperience: "",
          goals: "",
          dailyLearningTime: "",
          learningType: "",
          idealClassType: "",
          learningDifficulties: "",
          languageLevel: "",
          experiencePastClass: "",
          howWhereTheClasses: "",
          roleGroup: "",
          willingHomework: undefined,
        },
      ];
    }
    onSelectedChange(newSelectedStudents);
  };

  const selectedItems = items.filter((item) =>
    selectedStudents.some((s) => s.studentId === item._id)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10 hover:!bg-primary/30 dark:hover:!primary/30"
        >
          <div className="flex gap-1 flex-wrap">
            {selectedItems.length > 0
              ? selectedItems.map((item) => (
                  <span
                    key={item._id}
                    className="bg-muted text-muted-foreground text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1"
                  >
                    {item.name}
                    <div
                      className="ml-1 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(item._id);
                      }}
                    >
                      <X className="h-3 w-3 cursor-pointer" />
                    </div>
                  </span>
                ))
              : placeholder}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandEmpty>No item found.</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {items.map((item) => (
              <CommandItem
                key={item._id}
                value={item.name}
                onSelect={() => handleSelect(item._id)}
                className="hover:!bg-secondary/20 dark:hover:!secondary/30"
              >
                {item.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

