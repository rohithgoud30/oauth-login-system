import { Suspense } from "react";
import type { Metadata } from "next";
import { CallbackContent } from "./callback-content";

export const metadata: Metadata = {
  title: "Processing Authentication - OAuth System",
  description: "Processing your OAuth authentication callback",
};

export default function CallbackPage() {
  return (
    <Suspense fallback={<CallbackLoading />}>
      <CallbackContent />
    </Suspense>
  );
}

function CallbackLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="text-center space-y-6">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Processing Authentication</h2>
          <p className="text-muted-foreground">
            Please wait while we verify your credentials...
          </p>
        </div>
      </div>
    </div>
  );
}
