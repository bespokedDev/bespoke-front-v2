"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import type { StudentEnrollmentFormData, StudentBrief } from "../types/enrollment.types";
import {
  updateStudentField,
  updateStudentArrayField,
} from "../utils/enrollmentHelpers";
import {
  LEARNING_TYPES,
  LEARNING_TYPE_DESCRIPTIONS,
  ROLE_GROUP_OPTIONS,
  FIRST_TIME_LEARNING_OPTIONS,
  PREVIOUS_EXPERIENCE_OPTIONS,
  HOW_WHERE_CLASSES_OPTIONS,
} from "../constants/enrollment.constants";

interface StudentInformationFormProps {
  studentIds: StudentEnrollmentFormData[];
  students: StudentBrief[];
  openStudentSections: Record<string, boolean>;
  onToggleSection: (studentKey: string, open: boolean) => void;
  onUpdateStudent: (updated: StudentEnrollmentFormData[]) => void;
}

export function StudentInformationForm({
  studentIds,
  students,
  openStudentSections,
  onToggleSection,
  onUpdateStudent,
}: StudentInformationFormProps) {
  if (studentIds.length === 0) {
    return null;
  }

  const handleFieldChange = (
    index: number,
    field: keyof StudentEnrollmentFormData,
    value: string | number | undefined
  ) => {
    const updated = updateStudentField(studentIds, index, field, value);
    onUpdateStudent(updated);
  };

  const handleArrayFieldChange = (
    index: number,
    field: "learningType" | "roleGroup",
    value: string,
    checked: boolean
  ) => {
    const updated = updateStudentArrayField(
      studentIds,
      index,
      field,
      value,
      checked
    );
    onUpdateStudent(updated);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">
        Student Information <span className="text-red-500">*</span>
      </h3>
      {studentIds.map((student, index) => {
        const studentName =
          students.find((s) => s._id === student.studentId)?.name ||
          `Student ${index + 1}`;
        const studentKey = student.studentId || `student-${index}`;
        const isOpen = openStudentSections[studentKey] || false;

        const learningTypes = student.learningType
          ? student.learningType.split(",").map((t: string) => t.trim())
          : [];
        const roleGroups = student.roleGroup
          ? student.roleGroup.split(",").map((r: string) => r.trim())
          : [];

        return (
          <Collapsible
            key={studentKey}
            open={isOpen}
            onOpenChange={(open) => onToggleSection(studentKey, open)}
            className="border rounded-md"
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-4 h-auto bg-secondary/20 hover:bg-secondary/30 dark:bg-secondary/10 dark:hover:bg-secondary/20"
              >
                <span className="text-sm font-semibold">{studentName}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    isOpen ? "transform rotate-180" : ""
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Language level */}
                <div className="space-y-2">
                  <Label>
                    Language level <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={student.languageLevel || ""}
                    onChange={(e) =>
                      handleFieldChange(index, "languageLevel", e.target.value)
                    }
                    placeholder="e.g., Beginner, Intermediate, Advanced"
                    required
                  />
                </div>

                {/* Main goal */}
                <div className="space-y-2">
                  <Label>
                    Main goal <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={student.goals || ""}
                    onChange={(e) =>
                      handleFieldChange(index, "goals", e.target.value)
                    }
                    placeholder="e.g., Learn English for travel"
                    required
                  />
                </div>

                {/* Preferences */}
                <div className="space-y-2">
                  <Label>
                    Preferences <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    value={student.preferences || ""}
                    onChange={(e) =>
                      handleFieldChange(index, "preferences", e.target.value)
                    }
                    placeholder="e.g., Prefers practical and conversational classes"
                    rows={2}
                    required
                  />
                </div>

                {/* Ideal class */}
                <div className="space-y-2">
                  <Label>
                    Ideal class <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={student.idealClassType || ""}
                    onChange={(e) =>
                      handleFieldChange(index, "idealClassType", e.target.value)
                    }
                    placeholder="e.g., Individual classes"
                    required
                  />
                </div>

                {/* Learning type - Multiple checkboxes */}
                <div className="space-y-2 md:col-span-2">
                  <Label>
                    Learning type <span className="text-red-500">*</span>
                  </Label>
                  <div className="space-y-2 border rounded-md p-4">
                    {LEARNING_TYPES.map((type) => {
                      const isChecked = learningTypes.includes(type);
                      return (
                        <div key={type} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`learningType-${studentKey}-${type}`}
                            checked={isChecked}
                            onChange={(e) =>
                              handleArrayFieldChange(
                                index,
                                "learningType",
                                type,
                                e.target.checked
                              )
                            }
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <Label
                            htmlFor={`learningType-${studentKey}-${type}`}
                            className="cursor-pointer font-semibold text-primary"
                          >
                            {type}
                          </Label>
                          {LEARNING_TYPE_DESCRIPTIONS[type] && (
                            <span className="text-sm text-muted-foreground">
                              - {LEARNING_TYPE_DESCRIPTIONS[type]}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* First time learning a language */}
                <div className="space-y-2">
                  <Label>
                    First time learning a language{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={student.firstTimeLearningLanguage || ""}
                    onValueChange={(v) =>
                      handleFieldChange(index, "firstTimeLearningLanguage", v)
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FIRST_TIME_LEARNING_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Previous experience */}
                <div className="space-y-2">
                  <Label>
                    Previous experience <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={student.previousExperience || ""}
                    onValueChange={(v) =>
                      handleFieldChange(index, "previousExperience", v)
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PREVIOUS_EXPERIENCE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* How was that experience (experiencePastClass) */}
                <div className="space-y-2">
                  <Label>
                    How was that experience{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={student.experiencePastClass || ""}
                    onChange={(e) =>
                      handleFieldChange(
                        index,
                        "experiencePastClass",
                        e.target.value
                      )
                    }
                    placeholder="e.g., Very positive, learned a lot"
                    required
                  />
                </div>

                {/* How were the classes */}
                <div className="space-y-2">
                  <Label>
                    How were the classes <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={student.howWhereTheClasses || ""}
                    onValueChange={(v) =>
                      handleFieldChange(index, "howWhereTheClasses", v)
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {HOW_WHERE_CLASSES_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Role in a group - Multiple checkboxes */}
                <div className="space-y-2 md:col-span-2">
                  <Label>
                    Role in a group <span className="text-red-500">*</span>
                  </Label>
                  <div className="space-y-2 border rounded-md p-4">
                    {ROLE_GROUP_OPTIONS.map((role) => {
                      const isChecked = roleGroups.includes(role);
                      return (
                        <div key={role} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`roleGroup-${studentKey}-${role}`}
                            checked={isChecked}
                            onChange={(e) =>
                              handleArrayFieldChange(
                                index,
                                "roleGroup",
                                role,
                                e.target.checked
                              )
                            }
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <Label
                            htmlFor={`roleGroup-${studentKey}-${role}`}
                            className="cursor-pointer font-semibold text-primary"
                          >
                            {role}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Willingness to do homework */}
                <div className="space-y-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`willingHomework-${studentKey}`}
                    checked={student.willingHomework === 1}
                    onChange={(e) =>
                      handleFieldChange(
                        index,
                        "willingHomework",
                        e.target.checked ? 1 : undefined
                      )
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label
                    htmlFor={`willingHomework-${studentKey}`}
                    className="cursor-pointer"
                  >
                    Willingness to do homework
                  </Label>
                </div>

                {/* ATP (per day) */}
                <div className="space-y-2">
                  <Label>
                    Availability To Practice (per day){" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={student.dailyLearningTime || ""}
                    onChange={(e) =>
                      handleFieldChange(index, "dailyLearningTime", e.target.value)
                    }
                    placeholder="e.g., 1 hour per day"
                    required
                  />
                </div>

                {/* Learning difficulties */}
                <div className="space-y-2 md:col-span-2">
                  <Label>
                    Learning difficulties <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={student.learningDifficulties || ""}
                    onChange={(e) =>
                      handleFieldChange(
                        index,
                        "learningDifficulties",
                        e.target.value
                      )
                    }
                    placeholder="e.g., Difficulty with pronunciation"
                    required
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

