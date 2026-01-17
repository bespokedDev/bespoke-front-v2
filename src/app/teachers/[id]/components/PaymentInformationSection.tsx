"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import type { Professor, ProfessorFormData, PaymentData } from "../types";

interface PaymentInformationSectionProps {
  data: Professor | Partial<ProfessorFormData>;
  isEditing: boolean;
  onPaymentDataChange?: (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    field: keyof PaymentData
  ) => void;
  onAddPaymentMethod?: () => void;
  onRemovePaymentMethod?: (index: number) => void;
}

export function PaymentInformationSection({
  data,
  isEditing,
  onPaymentDataChange,
  onAddPaymentMethod,
  onRemovePaymentMethod,
}: PaymentInformationSectionProps) {
  const paymentData = (data as Professor).paymentData || (data as Partial<ProfessorFormData>).paymentData || [];

  // En modo lectura, solo mostrar si hay datos
  if (!isEditing && paymentData.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Information</CardTitle>
      </CardHeader>
      <CardContent>
        {!isEditing ? (
          <div className="space-y-6">
            {paymentData.map((payment, index) => (
              <div key={(payment as PaymentData & { _id?: string })._id || index}>
                <h4 className="font-semibold mb-4">
                  Method {index + 1}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Bank Name
                    </Label>
                    <p className="text-sm">{payment.bankName || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Account Type
                    </Label>
                    <p className="text-sm">
                      {payment.accountType || "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Account Number
                    </Label>
                    <p className="text-sm">
                      {payment.accountNumber || "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Holder&apos;s Name
                    </Label>
                    <p className="text-sm">
                      {payment.holderName || "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Holder&apos;s CI
                    </Label>
                    <p className="text-sm">{payment.holderCI || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Holder&apos;s Email
                    </Label>
                    <p className="text-sm">
                      {payment.holderEmail || "N/A"}
                    </p>
                  </div>
                </div>
                {index < paymentData.length - 1 && (
                  <div className="border-t my-6" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {paymentData.map((payment, index) => (
              <div key={index} className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Method {index + 1}</h4>
                  {paymentData.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-accent-1"
                      onClick={() => onRemovePaymentMethod?.(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input
                      value={payment.bankName}
                      onChange={(e) => onPaymentDataChange?.(e, index, "bankName")}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <Input
                      value={payment.accountType || ""}
                      onChange={(e) => onPaymentDataChange?.(e, index, "accountType")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input
                      value={payment.accountNumber || ""}
                      onChange={(e) => onPaymentDataChange?.(e, index, "accountNumber")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Holder&apos;s Name</Label>
                    <Input
                      value={payment.holderName || ""}
                      onChange={(e) => onPaymentDataChange?.(e, index, "holderName")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Holder&apos;s CI</Label>
                    <Input
                      value={payment.holderCI || ""}
                      onChange={(e) => onPaymentDataChange?.(e, index, "holderCI")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Holder&apos;s Email</Label>
                    <Input
                      value={payment.holderEmail || ""}
                      onChange={(e) => onPaymentDataChange?.(e, index, "holderEmail")}
                    />
                  </div>
                </div>
                {index < paymentData.length - 1 && (
                  <div className="border-t my-6" />
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={onAddPaymentMethod}
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Payment Method
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

