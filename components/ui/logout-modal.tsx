"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Clock } from "lucide-react";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export function LogoutModal({ 
  isOpen, 
  onClose, 
  title = "Session Ended",
  message = "Your session has expired for security reasons." 
}: LogoutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <Clock className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-center">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-600">
            <p>Please sign in again to continue using the application.</p>
          </div>
          <Button 
            onClick={onClose} 
            className="w-full flex items-center gap-2"
            size="lg"
          >
            <LogOut className="h-4 w-4" />
            Return to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}