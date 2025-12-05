"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface EditableEvaluationTextFieldProps {
  initialValue: string;
  onUpdate: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface EditableEvaluationTextareaFieldProps {
  initialValue: string;
  onUpdate: (value: string) => void;
  placeholder?: string;
}

export const EditableEvaluationTextField = ({ initialValue, onUpdate, placeholder, className }: EditableEvaluationTextFieldProps) => {
  const [value, setValue] = useState(initialValue || "");

  useEffect(() => {
    setValue(initialValue || "");
  }, [initialValue]);

  return (
    <Input
      value={value}
      onChange={(e) => {
        const newValue = e.target.value;
        setValue(newValue);
        onUpdate(newValue);
      }}
      placeholder={placeholder}
      className={className || "w-full"}
    />
  );
};

export const EditableEvaluationTextareaField = ({ initialValue, onUpdate, placeholder }: EditableEvaluationTextareaFieldProps) => {
  const [value, setValue] = useState(initialValue || "");

  useEffect(() => {
    setValue(initialValue || "");
  }, [initialValue]);

  return (
    <Textarea
      value={value}
      onChange={(e) => {
        const newValue = e.target.value;
        setValue(newValue);
        onUpdate(newValue);
      }}
      placeholder={placeholder}
      className="min-h-[60px] w-full"
    />
  );
};

