import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

const ClassBasedFilter = ({
  filterType,
  value,
  options,
  loading,
  onChange,
  label,
  disabled,
  helperText,
  branchNames = {},
  fullWidth = true
}) => {
  return (
    <div className={`space-y-1.5 ${fullWidth ? 'w-full' : ''}`}>
      {label && <Label className="text-xs text-muted-foreground font-medium">{label}</Label>}
      <div className="relative">
        <Select
          value={value || 'ALL_ITEMS_OPTION'}
          onValueChange={(val) => onChange(val === 'ALL_ITEMS_OPTION' ? '' : val)}
          disabled={disabled || loading}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={`All ${label || 'Items'}s`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL_ITEMS_OPTION">
              <span className="italic">All {label || 'Item'}s</span>
            </SelectItem>
            {(options || []).map((option, index) => {
              const optVal = String(option.value || option.label || option);
              const optLabel = filterType === 'schoolBranch' && branchNames[option.value]
                ? branchNames[option.value]
                : (option.label || option.value || option);

              return (
                <SelectItem key={optVal || index} value={optVal}>
                  {optLabel}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {loading && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
            <Spinner className="h-4 w-4" />
          </div>
        )}
      </div>
      {helperText && (
        <p className="text-xs text-muted-foreground mt-1 px-1">{helperText}</p>
      )}
    </div>
  );
};

export default ClassBasedFilter;
