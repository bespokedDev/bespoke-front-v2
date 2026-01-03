"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditableMinutesViewedFieldProps {
  registryId: string;
  initialValue: string;
  onUpdate: (value: string) => void;
  isReschedule?: boolean;
  disabled?: boolean;
}

interface EditableVocabularyContentFieldProps {
  registryId: string;
  initialValue: string;
  onUpdate: (value: string) => void;
  isReschedule?: boolean;
  disabled?: boolean;
}

interface EditableStudentMoodFieldProps {
  registryId: string;
  initialValue: string;
  onUpdate: (value: string) => void;
  isReschedule?: boolean;
  disabled?: boolean;
}

interface EditableHomeworkFieldProps {
  registryId: string;
  initialValue: string;
  onUpdate: (value: string) => void;
  isReschedule?: boolean;
  disabled?: boolean;
}

interface EditableClassViewedFieldProps {
  registryId: string;
  initialValue: number;
  onUpdate: (value: number) => void;
  isReschedule?: boolean;
  disabled?: boolean;
}

export const EditableMinutesViewedField = ({ registryId, initialValue, onUpdate, isReschedule = false, disabled = false }: EditableMinutesViewedFieldProps) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);
        
  return (
    <Input
      key={`minutesViewed-input-${registryId}`}
      type="number"
      min="0"
      max="59"
      value={value}
      onChange={(e) => {
        const newValue = e.target.value;
        setValue(newValue);
        onUpdate(newValue);
      }}
      disabled={disabled}
      className={`w-full max-w-24 ${isReschedule ? "bg-white" : ""}`}
    />
  );
};

export const EditableVocabularyContentField = ({ registryId, initialValue, onUpdate, isReschedule = false, disabled = false }: EditableVocabularyContentFieldProps) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <Input
      key={`vocabularyContent-input-${registryId}`}
      value={value}
      onChange={(e) => {
        const newValue = e.target.value;
        setValue(newValue);
        onUpdate(newValue);
      }}
      disabled={disabled}
      className={`w-full min-w-[120px] md:min-w-[150px] ${isReschedule ? "bg-white" : ""}`}
    />
  );
};

export const EditableStudentMoodField = ({ registryId, initialValue, onUpdate, isReschedule = false, disabled = false }: EditableStudentMoodFieldProps) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Opciones de estado de ánimo con emojis
  const moodOptions = [
    { value: "😊", label: "Happy" },
    { value: "😐", label: "Neutral" },
    { value: "☹️", label: "Sad" },
  ];

  return (
    <Select
      key={`studentMood-select-${registryId}`}
      value={value || ""}
      onValueChange={(newValue) => {
        setValue(newValue);
        onUpdate(newValue);
      }}
      disabled={disabled}
    >
      <SelectTrigger className={`w-full min-w-[100px] md:min-w-[120px] ${isReschedule ? "bg-white" : ""}`}>
        <SelectValue placeholder="Select mood..." />
      </SelectTrigger>
      <SelectContent>
        {moodOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="flex items-center gap-2">
              <span className="text-lg">{option.value}</span>
              <span>{option.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export const EditableHomeworkField = ({ registryId, initialValue, onUpdate, isReschedule = false, disabled = false }: EditableHomeworkFieldProps) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <Textarea
      key={`homework-input-${registryId}`}
      value={value}
      onChange={(e) => {
        const newValue = e.target.value;
        setValue(newValue);
        onUpdate(newValue);
      }}
      disabled={disabled}
      className={`min-h-[60px] w-full min-w-[150px] md:min-w-[200px] ${isReschedule ? "bg-white" : ""}`}
    />
  );
};

export const EditableClassViewedField = ({ registryId, initialValue, onUpdate, isReschedule = false, disabled = false }: EditableClassViewedFieldProps) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <Select
      key={`classViewed-select-${registryId}`}
      value={value.toString()}
      onValueChange={(newValue) => {
        const newClassViewed = Number(newValue);
        setValue(newClassViewed);
        onUpdate(newClassViewed);
      }}
      disabled={disabled}
    >
      <SelectTrigger className={`w-full ${isReschedule ? "bg-white" : ""}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="0">Pending</SelectItem>
        <SelectItem value="1">Viewed</SelectItem>
        <SelectItem value="2">Partially Viewed</SelectItem>
        <SelectItem value="3">No Show</SelectItem>
      </SelectContent>
    </Select>
  );
};

