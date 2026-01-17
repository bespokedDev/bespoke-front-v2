"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Professor, ProfessorFormData } from "../types";

interface ContactInformationSectionProps {
  data: Professor | Partial<ProfessorFormData>;
  isEditing: boolean;
  onFormChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNestedChange?: (
    e: React.ChangeEvent<HTMLInputElement>,
    parentKey: keyof ProfessorFormData,
    childKey: "name" | "phone"
  ) => void;
}

export function ContactInformationSection({
  data,
  isEditing,
  onFormChange,
  onNestedChange,
}: ContactInformationSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Information</CardTitle>
      </CardHeader>
      <CardContent>
        {!isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <Label className="font-semibold">Email</Label>
              <p className="text-sm">{(data as Professor).email}</p>
            </div>
            <div>
              <Label className="font-semibold">Phone</Label>
              <p className="text-sm">{(data as Professor).phone}</p>
            </div>
            {(data as Professor).emergencyContact &&
              ((data as Professor).emergencyContact.name ||
                (data as Professor).emergencyContact.phone) && (
                <>
                  <div className="md:col-span-2">
                    <Label className="font-semibold text-muted-foreground">
                      Emergency Contact
                    </Label>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground font-semibold">
                      Name
                    </Label>
                    <p className="text-sm">
                      {(data as Professor).emergencyContact.name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground font-semibold">
                      Phone
                    </Label>
                    <p className="text-sm">
                      {(data as Professor).emergencyContact.phone || "N/A"}
                    </p>
                  </div>
                </>
              )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={(data as Partial<ProfessorFormData>).email || ""}
                onChange={onFormChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={(data as Partial<ProfessorFormData>).phone || ""}
                onChange={onFormChange}
                required
              />
            </div>
            <div className="md:col-span-2">
              <Label className="font-semibold text-muted-foreground">
                Emergency Contact
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyName">Name</Label>
              <Input
                id="emergencyName"
                value={(data as Partial<ProfessorFormData>).emergencyContact?.name || ""}
                onChange={(e) => onNestedChange?.(e, "emergencyContact", "name")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyPhone">Phone</Label>
              <Input
                id="emergencyPhone"
                type="tel"
                value={(data as Partial<ProfessorFormData>).emergencyContact?.phone || ""}
                onChange={(e) => onNestedChange?.(e, "emergencyContact", "phone")}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

