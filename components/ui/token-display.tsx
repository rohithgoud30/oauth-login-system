"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TokenData,
  tokenManager,
  TokenManager,
  UserSession,
} from "@/lib/oauth/token-manager";
import { useEffect, useState } from "react";
import { Clock, Key, Shield, Copy, Check, Eye, EyeOff, RefreshCw } from "lucide-react";

interface TokenDisplayProps {
  tokens: TokenData;
  onRefresh?: (newTokens: TokenData) => void;
}

export function TokenDisplay({ tokens: initialTokens, onRefresh }: TokenDisplayProps) {
  const [tokens, setTokens] = useState<TokenData>(initialTokens);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [copied, setCopied] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [showRefreshToken, setShowRefreshToken] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  useEffect(() => {
    const updateTimer = () => {
      setTimeRemaining(TokenManager.formatTokenExpiry(tokens));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [tokens]);

  // Update tokens when initialTokens change
  useEffect(() => {
    setTokens(initialTokens);
  }, [initialTokens]);

  const isExpired = tokenManager.isTokenExpired(tokens);
  const hasRefreshToken = !!tokens.refresh_token;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const toggleTokenVisibility = () => {
    setShowToken((prev) => !prev);
  };

  const toggleRefreshTokenVisibility = () => {
    setShowRefreshToken((prev) => !prev);
  };

  const handleRefreshToken = async () => {
    if (!tokens.refresh_token) return;
    
    setIsRefreshing(true);
    setRefreshError(null);
    
    try {
      // Get current session to get the provider
      const session = tokenManager.getSession();
      if (!session) {
        setRefreshError("No active session found");
        setIsRefreshing(false);
        return;
      }
      
      // Call the API to refresh the token
      const response = await fetch("/api/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh_token: tokens.refresh_token,
          provider: session.user.provider,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to refresh token");
      }
      
      const data = await response.json();
      
      if (data.success && data.tokens) {
        // Update the tokens in the component state
        setTokens(data.tokens);
        
        // Update the session in the token manager
        if (session) {
          const updatedSession: UserSession = {
            ...session,
            tokens: data.tokens,
            updated_at: Date.now(),
          };
          tokenManager.saveSession(updatedSession);
        }
        
        // Notify parent component if callback provided
        if (onRefresh) {
          onRefresh(data.tokens);
        }
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
      setRefreshError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Access Token
        </CardTitle>
        <CardDescription>OAuth token information and status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status:</span>
            <Badge variant={isExpired ? "destructive" : "default"}>
              {isExpired ? "Expired" : "Active"}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Type:</span>
            <Badge variant="outline">{tokens.token_type}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Expires:</span>
            <div className="flex items-center gap-1 text-sm">
              <Clock className="h-3 w-3" />
              {timeRemaining}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-medium">Scopes:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {tokens.scope
              .split(" ")
              .filter(Boolean)
              .map((scope) => (
                <Badge key={scope} variant="secondary" className="text-xs">
                  {scope}
                </Badge>
              ))}
          </div>
        </div>

        {/* Access Token */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Access Token:</span>
            <div className="flex gap-1">
              <Button onClick={toggleTokenVisibility} variant="ghost" size="sm">
                {showToken ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </Button>
              <Button
                onClick={() =>
                  copyToClipboard(tokens.access_token, "access_token")
                }
                variant="ghost"
                size="sm"
              >
                {copied === "access_token" ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
          <div className="bg-muted p-2 rounded text-xs font-mono break-all max-h-20 overflow-y-auto">
            {showToken
              ? tokens.access_token
              : `${tokens.access_token.substring(0, 20)}...`}
          </div>
        </div>

        {/* Refresh Token (if available) */}
        {tokens.refresh_token && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Refresh Token:</span>
              <div className="flex gap-1">
                <Button onClick={toggleRefreshTokenVisibility} variant="ghost" size="sm">
                  {showRefreshToken ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  onClick={() =>
                    copyToClipboard(tokens.refresh_token!, "refresh_token")
                  }
                  variant="ghost"
                  size="sm"
                >
                  {copied === "refresh_token" ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
            <div className="bg-muted p-2 rounded text-xs font-mono break-all max-h-20 overflow-y-auto">
              {showRefreshToken
                ? tokens.refresh_token
                : `${tokens.refresh_token.substring(0, 20)}...`}
            </div>
          </div>
        )}

        {refreshError && (
          <div className="text-sm text-destructive">{refreshError}</div>
        )}
      </CardContent>
      
      {hasRefreshToken && (
        <CardFooter>
          <Button 
            onClick={handleRefreshToken} 
            disabled={isRefreshing} 
            className="w-full"
            variant="outline"
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Token
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
