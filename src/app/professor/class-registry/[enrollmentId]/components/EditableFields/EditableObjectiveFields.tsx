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
import type { ContentClass } from "../../types";

interface EditableObjectiveCellProps {
  initialValue: string;
  onUpdate?: (value: string) => void;
}

interface EditableTeachersNoteCellProps {
  initialValue: string;
  onUpdate?: (value: string) => void;
}

interface EditableObjectiveDateCellProps {
  initialValue: string;
  onUpdate?: (value: string) => void;
}

interface EditableCategoryCellProps {
  initialValue: string;
  contentClasses: ContentClass[];
  onUpdate?: (value: string) => void;
}

interface EditableAchievedCellProps {
  initialValue: boolean;
  onUpdate?: (value: boolean) => void;
}

export const EditableObjectiveCell = ({ initialValue, onUpdate }: EditableObjectiveCellProps) => {
  const [value, setValue] = useState(initialValue);
  
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);
  
  return (
    <Textarea
      value={value}
      onChange={(e) => {
        const newValue = e.target.value;
        setValue(newValue);
        onUpdate?.(newValue);
      }}
      className="min-h-[60px]"
    />
  );
};

export const EditableTeachersNoteCell = ({ initialValue, onUpdate }: EditableTeachersNoteCellProps) => {
  const [value, setValue] = useState(initialValue);
  
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);
  
  return (
    <Textarea
      value={value}
      onChange={(e) => {
        const newValue = e.target.value;
        setValue(newValue);
        onUpdate?.(newValue);
      }}
      className="min-h-[60px]"
    />
  );
};

export const EditableObjectiveDateCell = ({ initialValue, onUpdate }: EditableObjectiveDateCellProps) => {
  const [value, setValue] = useState(initialValue);
  
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);
  
  return (
    <Input
      type="date"
      value={value}
      onChange={(e) => {
        const newValue = e.target.value;
        setValue(newValue);
        onUpdate?.(newValue);
      }}
    />
  );
};

export const EditableCategoryCell = ({ initialValue, contentClasses, onUpdate }: EditableCategoryCellProps) => {
  const [value, setValue] = useState(initialValue);
  
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);
  
  return (
    <Select
      value={value}
      onValueChange={(newValue) => {
        setValue(newValue);
        onUpdate?.(newValue);
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {contentClasses.map((cc) => (
          <SelectItem key={cc._id} value={cc._id}>
            {cc.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export const EditableAchievedCell = ({ initialValue, onUpdate }: EditableAchievedCellProps) => {
  const [value, setValue] = useState(initialValue);
  
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);
  
  return (
    <input
      type="checkbox"
      checked={value}
      onChange={(e) => {
        const newValue = e.target.checked;
        setValue(newValue);
        onUpdate?.(newValue);
      }}
      className="rounded"
    />
  );
};

