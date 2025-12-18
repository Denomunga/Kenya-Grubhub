import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showPassword?: boolean;
  onToggleVisibility?: () => void;
}

export function PasswordInput({ 
  showPassword: externalShowPassword, 
  onToggleVisibility: externalOnToggle,
  className = "",
  ...props 
}: PasswordInputProps) {
  const [internalShowPassword, setInternalShowPassword] = useState(false);
  const showPassword = externalShowPassword !== undefined ? externalShowPassword : internalShowPassword;
  const onToggle = externalOnToggle || (() => setInternalShowPassword(!internalShowPassword));

  return (
    <div className="relative">
      <Input
        type={showPassword ? "text" : "password"}
        className={`pr-10 ${className}`}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
        onClick={onToggle}
        tabIndex={-1}
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Eye className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
}
