import React, { useState, useEffect } from 'react';
import { Input } from './input';
import { Clock } from 'lucide-react';

const TimePickerWheel = ({ value, onChange, placeholder = "HH:MM", className = "" }) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  // Initialize from value prop
  useEffect(() => {
    if (value) {
      setInputValue(value);
    }
  }, [value]);

  const handleInputChange = (e) => {
    let input = e.target.value.replace(/[^\d:]/g, '');
    
    // Auto-format: add colon after 2 digits
    if (input.length === 2 && !input.includes(':')) {
      input += ':';
    }
    
    // Limit to HH:MM format
    if (input.length > 5) {
      input = input.slice(0, 5);
    }
    
    setInputValue(input);
    setError('');
    
    // Validate and update if complete
    const timeRegex = /^([01]?\d|2[0-3]):([0-5]?\d)$/;
    if (timeRegex.test(input)) {
      onChange(input);
    } else if (input.length === 5) {
      setError('Invalid time format. Use 24-hour format (00:00 - 23:59)');
    }
  };

  const handleBlur = () => {
    // Final validation on blur
    const timeRegex = /^([01]?\d|2[0-3]):([0-5]?\d)$/;
    if (inputValue && !timeRegex.test(inputValue)) {
      setError('Invalid time format. Use 24-hour format (00:00 - 23:59)');
    } else if (inputValue) {
      onChange(inputValue);
    }
  };

  return (
    <div className={className}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>
        <Input
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={`pl-10 font-mono text-center ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
          maxLength={5}
        />
      </div>
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
      <p className="text-xs text-muted-foreground mt-1">
        24-hour format (e.g., 14:30, 09:15)
      </p>
    </div>
  );
};

export default TimePickerWheel;
