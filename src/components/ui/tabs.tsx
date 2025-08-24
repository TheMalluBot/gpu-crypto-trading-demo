import React from 'react';

export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ children, ...props }) => {
  return <div {...props}>{children}</div>;
};

export const TabsList: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = "" 
}) => {
  return <div className={`flex space-x-1 ${className}`}>{children}</div>;
};

export const TabsTrigger: React.FC<{ 
  value: string; 
  children: React.ReactNode; 
  className?: string 
}> = ({ children, className = "" }) => {
  return <button className={`px-3 py-2 rounded ${className}`}>{children}</button>;
};

export const TabsContent: React.FC<{ 
  value: string; 
  children: React.ReactNode; 
  className?: string 
}> = ({ children, className = "" }) => {
  return <div className={className}>{children}</div>;
};
