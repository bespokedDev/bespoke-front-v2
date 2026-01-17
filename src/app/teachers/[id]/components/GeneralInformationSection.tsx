"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateForDisplay } from "@/lib/dateUtils";
import type { Professor, ProfessorFormData, ProfessorType } from "../types";

interface GeneralInformationSectionProps {
  data: Professor | Partial<ProfessorFormData>;
  isEditing: boolean;
  professorTypes: ProfessorType[];
  isAdmin: boolean;
  onFormChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  typeSelectComponent?: React.ReactNode;
}

export function GeneralInformationSection({
  data,
  isEditing,
  professorTypes,
  isAdmin,
  onFormChange,
  typeSelectComponent,
}: GeneralInformationSectionProps) {
  const getProfessorTypeName = (typeId: string | { _id: string; name: string } | undefined): string => {
    if (!typeId) return "N/A";
    if (typeof typeId === 'object' && typeId?.name) {
      return typeId.name;
    }
    if (typeof typeId === 'string') {
      return professorTypes.find((t) => t._id === typeId)?.name || "N/A";
    }
    return "N/A";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Information</CardTitle>
      </CardHeader>
      <CardContent>
        {!isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <Label className="font-semibold">Full Name</Label>
              <p className="text-sm font-semibold">{(data as Professor).name}</p>
            </div>
            <div>
              <Label className="font-semibold">CI Number</Label>
              <p className="text-sm font-semibold">{(data as Professor).ciNumber}</p>
            </div>
            <div>
              <Label className="font-semibold">Date of Birth</Label>
              <p className="text-sm">
                {(data as Professor).dob ? formatDateForDisplay((data as Professor).dob) : "N/A"}
              </p>
            </div>
            <div>
              <Label className="font-semibold">Start Date</Label>
              <p className="text-sm">
                {(data as Professor).startDate
                  ? formatDateForDisplay((data as Professor).startDate)
                  : "N/A"}
              </p>
            </div>
            <div>
              <Label className="font-semibold">Occupation</Label>
              <p className="text-sm">{(data as Professor).occupation || "N/A"}</p>
            </div>
            <div>
              <Label className="font-semibold">Professor Type</Label>
              <p className="text-sm">
                {getProfessorTypeName((data as Professor).typeId)}
              </p>
            </div>
            <div>
              <Label className="font-semibold">Status</Label>
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  (data as Professor).isActive
                    ? "bg-secondary/20 text-secondary"
                    : "bg-accent-1/20 text-accent-1"
                }`}
              >
                {(data as Professor).isActive ? "Active" : "Inactive"}
              </span>
            </div>
            {isAdmin && (
              <div>
                <Label className="font-semibold">Password</Label>
                <p className="text-sm">{(data as Professor).password}</p>
              </div>
            )}
            <div className="md:col-span-2">
              <Label className="font-semibold">Address</Label>
              <p className="text-sm">{(data as Professor).address || "N/A"}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                value={(data as Partial<ProfessorFormData>).name || ""}
                onChange={onFormChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ciNumber">CI Number</Label>
              <Input
                id="ciNumber"
                name="ciNumber"
                value={(data as Partial<ProfessorFormData>).ciNumber || ""}
                onChange={onFormChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                name="dob"
                type="date"
                max="9999-12-31"
                value={(data as Partial<ProfessorFormData>).dob || ""}
                onChange={onFormChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                max="9999-12-31"
                value={(data as Partial<ProfessorFormData>).startDate || ""}
                onChange={onFormChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                name="occupation"
                value={(data as Partial<ProfessorFormData>).occupation || ""}
                onChange={onFormChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="typeId">
                Professor Type <span className="text-red-500">*</span>
              </Label>
              {typeSelectComponent}
            </div>
            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value=""
                  disabled
                  className="bg-muted"
                  placeholder="Password cannot be edited here"
                />
              </div>
            )}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={(data as Partial<ProfessorFormData>).address || ""}
                onChange={onFormChange}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

