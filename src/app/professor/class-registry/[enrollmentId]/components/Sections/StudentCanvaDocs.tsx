"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { formatDateForDisplay } from "@/lib/dateUtils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FileText, ChevronDown, ChevronUp, Loader2, AlertCircle } from "lucide-react";
import type { CanvaDoc } from "@/types/canvaDoc.types";

interface StudentCanvaDocsProps {
  studentId: string;
  studentName: string;
}

export function StudentCanvaDocs({
  studentId,
}: StudentCanvaDocsProps) {
  const [canvaDocs, setCanvaDocs] = useState<CanvaDoc[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);


  const fetchCanvaDocs = async () => {
    if (hasFetched || isLoading) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient(`api/canva-docs?studentId=${studentId}`);
      setCanvaDocs(response.canvaDocs || []);
      setHasFetched(true);
    } catch (err: unknown) {
      const errorMessage = getFriendlyErrorMessage(
        err,
        "Failed to load CanvaDocs. Please try again."
      );
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Load CanvaDocs when component mounts (to get count even if closed)
  useEffect(() => {
    if (!hasFetched && !isLoading) {
      fetchCanvaDocs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  // Show only active CanvaDocs
  const activeCanvaDocs = canvaDocs.filter((doc) => doc.isActive);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-3.5 w-3.5 text-primary" />
        <Label className="text-xs font-semibold text-foreground">
          CanvaDocs
        </Label>
        <span className="text-xs text-muted-foreground">
          ({activeCanvaDocs.length})
        </span>
      </div>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between h-8 text-xs"
          >
            <span className="text-xs">
              {isOpen ? "Hide" : "Show"} Documents
            </span>
            {isOpen ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs px-2 py-1 rounded flex items-center gap-1">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>{error}</span>
          </div>
        ) : activeCanvaDocs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No active CanvaDocs</p>
        ) : (
          activeCanvaDocs.map((canvaDoc) => (
            <div
              key={canvaDoc._id}
              className="border rounded p-2 space-y-1 bg-muted/30"
            >
              <div className="flex items-start gap-2">
                <FileText className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium break-words">
                    {canvaDoc.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Created: {formatDateForDisplay(canvaDoc.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
    </div>
  );
}

