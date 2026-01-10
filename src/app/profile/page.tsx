"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Save, ArrowLeft } from "lucide-react";

interface ProfileFormData {
  name: string;
  email: string;
  phone?: string;
  ciNumber?: string;
  studentCode?: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ProfessorUpdatePayload {
  name: string;
  email: string;
  phone?: string;
  ciNumber?: string;
}

interface PasswordUpdatePayload {
  currentPassword: string;
  newPassword: string;
}

interface PasswordValidation {
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export default function ProfilePage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>({
    name: "",
    email: "",
    phone: "",
    ciNumber: "",
    studentCode: "",
  });
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Cargar datos del usuario
  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        setFormData({
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          ciNumber: user.ciNumber || "",
          studentCode: user.studentCode || "",
        });

        // Si es estudiante, cargar datos completos para obtener el avatar
        if (user.role?.toLowerCase() === "student") {
          try {
            const studentData = await apiClient(`api/students/${user.id}`);
            if (studentData.avatar) {
              setUserAvatar(studentData.avatar);
            }
          } catch (err) {
            console.error("Error loading student data:", err);
          }
        }

        setIsLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setSuccessMessage(null);
  };

  const validatePassword = (password: string): PasswordValidation => {
    const specialChars = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/;
    return {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: specialChars.test(password),
    };
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => {
      const updated = { ...prev, [name]: value };
      // Validar la nueva contraseña en tiempo real
      if (name === "newPassword") {
        setPasswordValidation(validatePassword(value));
      }
      return updated;
    });
    setPasswordError(null);
    setPasswordSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Preparar payload según el rol del usuario
      const payload: ProfessorUpdatePayload = {
        name: formData.name,
        email: formData.email,
      };

      // Agregar campos específicos según el rol
      if (user.role?.toLowerCase() === "professor" && formData.ciNumber) {
        payload.ciNumber = formData.ciNumber;
      }
      if (formData.phone) {
        payload.phone = formData.phone;
      }

      // Solo profesores pueden actualizar su propia información
      if (user.role?.toLowerCase() === "professor") {
        const endpoint = `api/professors/${user.id}`;
        
        // Actualizar en el backend
        const updatedData = await apiClient(endpoint, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        // Actualizar el contexto de autenticación con los nuevos datos
        const updatedUser = {
          ...user,
          ...payload,
          ...updatedData,
        };
        login(localStorage.getItem("authToken") || "", updatedUser);

        setSuccessMessage("Profile updated successfully!");
      }
    } catch (err: unknown) {
      const errorMessage = getFriendlyErrorMessage(
        err,
        "Failed to update profile. Please try again."
      );
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validaciones
    if (!passwordData.currentPassword || passwordData.currentPassword.trim() === "") {
      setPasswordError("Current password is required");
      return;
    }

    if (!passwordData.newPassword || passwordData.newPassword.trim() === "") {
      setPasswordError("New password is required");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (passwordData.newPassword === passwordData.currentPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    // Validar criterios de seguridad
    const validation = validatePassword(passwordData.newPassword);
    if (!validation.minLength || !validation.hasUpperCase || !validation.hasLowerCase || !validation.hasNumber || !validation.hasSpecialChar) {
      const errors: string[] = [];
      if (!validation.minLength) errors.push("Password must be at least 8 characters long");
      if (!validation.hasUpperCase) errors.push("Password must contain at least one uppercase letter");
      if (!validation.hasLowerCase) errors.push("Password must contain at least one lowercase letter");
      if (!validation.hasNumber) errors.push("Password must contain at least one number");
      if (!validation.hasSpecialChar) errors.push("Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)");
      setPasswordError(errors.join(". "));
      return;
    }

    setIsChangingPassword(true);
    setPasswordError(null);
    setPasswordSuccessMessage(null);

    try {
      const role = user.role?.toLowerCase();
      let endpoint = "";
      
      // Determinar el endpoint según el rol del usuario
      if (role === "admin" || role === "user") {
        endpoint = `api/users/${user.id}/change-password`;
      } else if (role === "professor") {
        endpoint = `api/professors/${user.id}/change-password`;
      } else if (role === "student") {
        endpoint = `api/students/${user.id}/change-password`;
      } else {
        setPasswordError("User role not recognized");
        setIsChangingPassword(false);
        return;
      }

      const payload: PasswordUpdatePayload = {
        currentPassword: passwordData.currentPassword.trim(),
        newPassword: passwordData.newPassword.trim(),
      };

      await apiClient(endpoint, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setPasswordSuccessMessage("Password changed successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordValidation({
        minLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumber: false,
        hasSpecialChar: false,
      });
    } catch (err: unknown) {
      const errorMessage = getFriendlyErrorMessage(
        err,
        "Failed to change password. Please try again."
      );
      setPasswordError(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getUserInitials = (name?: string): string => {
    if (!name || name.trim() === "") {
      return "U";
    }
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length === 1) {
      return nameParts[0].substring(0, 2).toUpperCase();
    } else {
      return nameParts
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profile" subtitle="User profile information" />
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Please log in to view your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isProfessor = user.role?.toLowerCase() === "professor";
  const isStudent = user.role?.toLowerCase() === "student";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader 
          title="Profile" 
          subtitle={isProfessor ? "Manage your account information" : "Your account information"} 
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Información del perfil */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your personal account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                {userAvatar ? (
                  <AvatarImage src={userAvatar} alt={user.name} />
                ) : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {getUserInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-lg">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
              </div>
            </div>

            {/* Solo profesores pueden editar */}
            {isProfessor ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ciNumber">CI Number</Label>
                  <Input
                    id="ciNumber"
                    name="ciNumber"
                    value={formData.ciNumber || ""}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone || ""}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </div>

                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-md">
                    {successMessage}
                  </div>
                )}

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </form>
            ) : (
              // Admin y estudiantes solo ven información (sin formulario)
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="text-sm">{formData.name || "N/A"}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="text-sm">{formData.email || "N/A"}</p>
                </div>

                {isStudent && formData.studentCode && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Student Code</Label>
                    <p className="text-sm">{formData.studentCode}</p>
                  </div>
                )}

                {formData.phone && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="text-sm">{formData.phone}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información adicional y cambio de contraseña */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>Additional account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Role</Label>
                <p className="text-sm capitalize">{user.role}</p>
              </div>

              {user.userType && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">User Type</Label>
                  <p className="text-sm capitalize">{user.userType}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cambio de contraseña - Para todos los usuarios */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password *</Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    disabled={isChangingPassword}
                    placeholder="Enter current password"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password *</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    disabled={isChangingPassword}
                    placeholder="Enter new password"
                    required
                  />
                  {/* Indicadores de validación de contraseña */}
                  {passwordData.newPassword && (
                    <div className="space-y-1 mt-2 text-xs">
                      <div className={`flex items-center gap-2 ${passwordValidation.minLength ? "text-green-600" : "text-muted-foreground"}`}>
                        <span>{passwordValidation.minLength ? "✓" : "○"}</span>
                        <span>At least 8 characters</span>
                      </div>
                      <div className={`flex items-center gap-2 ${passwordValidation.hasUpperCase ? "text-green-600" : "text-muted-foreground"}`}>
                        <span>{passwordValidation.hasUpperCase ? "✓" : "○"}</span>
                        <span>One uppercase letter (A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-2 ${passwordValidation.hasLowerCase ? "text-green-600" : "text-muted-foreground"}`}>
                        <span>{passwordValidation.hasLowerCase ? "✓" : "○"}</span>
                        <span>One lowercase letter (a-z)</span>
                      </div>
                      <div className={`flex items-center gap-2 ${passwordValidation.hasNumber ? "text-green-600" : "text-muted-foreground"}`}>
                        <span>{passwordValidation.hasNumber ? "✓" : "○"}</span>
                        <span>One number (0-9)</span>
                      </div>
                      <div className={`flex items-center gap-2 ${passwordValidation.hasSpecialChar ? "text-green-600" : "text-muted-foreground"}`}>
                        <span>{passwordValidation.hasSpecialChar ? "✓" : "○"}</span>
                        <span>One special character (e.g., !@#$%^&*)</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    disabled={isChangingPassword}
                    placeholder="Confirm new password"
                    required
                  />
                </div>

                {passwordError && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md whitespace-pre-line">
                    {passwordError}
                  </div>
                )}

                {passwordSuccessMessage && (
                  <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-md">
                    {passwordSuccessMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full"
                  variant="outline"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Changing Password...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
