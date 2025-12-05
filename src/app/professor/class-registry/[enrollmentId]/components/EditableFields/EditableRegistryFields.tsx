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
}

interface EditableVocabularyContentFieldProps {
  registryId: string;
  initialValue: string;
  onUpdate: (value: string) => void;
}

interface EditableStudentMoodFieldProps {
  registryId: string;
  initialValue: string;
  onUpdate: (value: string) => void;
}

interface EditableHomeworkFieldProps {
  registryId: string;
  initialValue: string;
  onUpdate: (value: string) => void;
}

interface EditableClassViewedFieldProps {
  registryId: string;
  initialValue: number;
  onUpdate: (value: number) => void;
}

export const EditableMinutesViewedField = ({ registryId, initialValue, onUpdate }: EditableMinutesViewedFieldProps) => {
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
      className="w-full max-w-24"
    />
  );
};

export const EditableVocabularyContentField = ({ registryId, initialValue, onUpdate }: EditableVocabularyContentFieldProps) => {
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
      className="w-full min-w-[120px] md:min-w-[150px]"
    />
  );
};

export const EditableStudentMoodField = ({ registryId, initialValue, onUpdate }: EditableStudentMoodFieldProps) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <Input
      key={`studentMood-input-${registryId}`}
      value={value}
      onChange={(e) => {
        const newValue = e.target.value;
        setValue(newValue);
        onUpdate(newValue);
      }}
      className="w-full min-w-[100px] md:min-w-[120px]"
    />
  );
};

export const EditableHomeworkField = ({ registryId, initialValue, onUpdate }: EditableHomeworkFieldProps) => {
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
      className="min-h-[60px] w-full min-w-[150px] md:min-w-[200px]"
    />
  );
};

export const EditableClassViewedField = ({ registryId, initialValue, onUpdate }: EditableClassViewedFieldProps) => {
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
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="0">Pending</SelectItem>
        <SelectItem value="1">Viewed</SelectItem>
        <SelectItem value="3">No Show</SelectItem>
      </SelectContent>
    </Select>
  );
};

