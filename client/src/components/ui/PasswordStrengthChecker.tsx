import React, { useState, useEffect } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';

interface PasswordStrengthCheckerProps {
  password: string;
  onStrengthChange?: (strength: number, isValid: boolean) => void;
}

interface StrengthRequirement {
  regex: RegExp;
  text: string;
  weight: number;
}

export default function PasswordStrengthChecker({ password, onStrengthChange }: PasswordStrengthCheckerProps) {
  const [strength, setStrength] = useState(0);
  const [requirements, setRequirements] = useState<Array<{
    text: string;
    met: boolean;
    weight: number;
  }>>([]);

  const strengthRequirements: StrengthRequirement[] = [
    { regex: /.{8,}/, text: 'At least 8 characters', weight: 20 },
    { regex: /.{12,}/, text: 'At least 12 characters (recommended)', weight: 10 },
    { regex: /[A-Z]/, text: 'One uppercase letter', weight: 20 },
    { regex: /[a-z]/, text: 'One lowercase letter', weight: 20 },
    { regex: /\d/, text: 'One number', weight: 20 },
    { regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, text: 'One special character', weight: 10 },
  ];

  useEffect(() => {
    const checkedRequirements = strengthRequirements.map(req => ({
      text: req.text,
      met: req.regex.test(password),
      weight: req.weight
    }));

    setRequirements(checkedRequirements);

    const totalStrength = checkedRequirements.reduce((acc, req) => {
      return acc + (req.met ? req.weight : 0);
    }, 0);

    setStrength(totalStrength);

    const isValid = checkedRequirements.filter(req => 
      req.text.includes('uppercase') || 
      req.text.includes('lowercase') || 
      req.text.includes('number') || 
      req.text.includes('8 characters')
    ).every(req => req.met);

    onStrengthChange?.(totalStrength, isValid);
  }, [password, onStrengthChange]);

  const getStrengthColor = () => {
    if (strength < 30) return 'bg-red-500';
    if (strength < 50) return 'bg-orange-500';
    if (strength < 70) return 'bg-yellow-500';
    if (strength < 90) return 'bg-lime-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (strength < 30) return 'Very Weak';
    if (strength < 50) return 'Weak';
    if (strength < 70) return 'Fair';
    if (strength < 90) return 'Good';
    return 'Strong';
  };

  const getStrengthTextColor = () => {
    if (strength < 30) return 'text-red-500';
    if (strength < 50) return 'text-orange-500';
    if (strength < 70) return 'text-yellow-500';
    if (strength < 90) return 'text-lime-500';
    return 'text-green-500';
  };

  if (!password) {
    return (
      <div className="space-y-2 mt-2">
        <p className="text-xs text-muted-foreground">Password requirements:</p>
        <div className="space-y-1">
          {strengthRequirements.map((req, index) => (
            <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
              <X className="h-3 w-3" />
              <span>{req.text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-2">
      {/* Strength indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Password Strength:</span>
          <span className={`text-xs font-bold ${getStrengthTextColor()}`}>
            {getStrengthText()}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
            style={{ width: `${Math.min(strength, 100)}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Requirements:</p>
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            {req.met ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <X className="h-3 w-3 text-red-500" />
            )}
            <span className={req.met ? 'text-green-600' : 'text-red-600'}>
              {req.text}
            </span>
          </div>
        ))}
      </div>

      {/* Security tips */}
      {strength < 70 && password.length > 0 && (
        <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-800">
            <p className="font-medium">Security Tip:</p>
            <p>
              {strength < 30 
                ? "Consider using a passphrase or password manager to generate a strong password."
                : strength < 50
                ? "Add more variety with special characters and increase length for better security."
                : "You're getting close! Consider adding more characters or complexity for optimal security."
              }
            </p>
          </div>
        </div>
      )}

      {/* Success message for strong passwords */}
      {strength >= 90 && (
        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
          <Check className="h-4 w-4 text-green-600" />
          <p className="text-xs text-green-800 font-medium">
            Excellent! Your password meets all security requirements.
          </p>
        </div>
      )}
    </div>
  );
}

// Helper function to validate password for form submission
export function validatePasswordStrength(password: string): { isValid: boolean; strength: number; message?: string } {
  const requirements = [
    { regex: /.{8,}/, text: 'At least 8 characters', required: true },
    { regex: /[A-Z]/, text: 'One uppercase letter', required: true },
    { regex: /[a-z]/, text: 'One lowercase letter', required: true },
    { regex: /\d/, text: 'One number', required: true },
  ];

  const failedRequirements = requirements.filter(req => req.required && !req.regex.test(password));
  
  if (failedRequirements.length > 0) {
    return {
      isValid: false,
      strength: 0,
      message: `Password must include: ${failedRequirements.map(req => req.text).join(', ')}`
    };
  }

  // Calculate strength
  const strengthRequirements = [
    { regex: /.{8,}/, weight: 20 },
    { regex: /.{12,}/, weight: 10 },
    { regex: /[A-Z]/, weight: 20 },
    { regex: /[a-z]/, weight: 20 },
    { regex: /\d/, weight: 20 },
    { regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, weight: 10 },
  ];

  const totalStrength = strengthRequirements.reduce((acc, req) => {
    return acc + (req.regex.test(password) ? req.weight : 0);
  }, 0);

  return {
    isValid: true,
    strength: totalStrength
  };
}
