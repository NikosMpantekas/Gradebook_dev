import React, { useState, useRef, useEffect } from 'react';
import { Card } from './card';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog';
import { Clock } from 'lucide-react';

const TimePickerWheel = ({ value, onChange, placeholder = "Select time", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState('00');
  const [minutes, setMinutes] = useState('00');
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [keyboardValue, setKeyboardValue] = useState('');
  
  const hoursRef = useRef(null);
  const minutesRef = useRef(null);

  // Initialize state from value prop
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      setHours(h.padStart(2, '0'));
      setMinutes(m.padStart(2, '0'));
      setKeyboardValue(value);
    }
  }, [value]);

  // Generate hour and minute arrays
  const hoursArray = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutesArray = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const handleWheelScroll = (e, type) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    
    if (type === 'hours') {
      const currentIndex = hoursArray.indexOf(hours);
      const newIndex = Math.max(0, Math.min(23, currentIndex + delta));
      setHours(hoursArray[newIndex]);
    } else {
      const currentIndex = minutesArray.indexOf(minutes);
      const newIndex = Math.max(0, Math.min(59, currentIndex + delta));
      setMinutes(minutesArray[newIndex]);
    }
  };

  const handleItemClick = (value, type) => {
    if (type === 'hours') {
      setHours(value);
    } else {
      setMinutes(value);
    }
  };

  const handleConfirm = () => {
    const timeValue = `${hours}:${minutes}`;
    onChange(timeValue);
    setIsOpen(false);
    setKeyboardMode(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setKeyboardMode(false);
    setKeyboardValue(value || '');
  };

  const handleKeyboardInput = () => {
    setKeyboardMode(true);
    setKeyboardValue(value || '');
  };

  const handleKeyboardChange = (e) => {
    setKeyboardValue(e.target.value);
  };

  const handleKeyboardConfirm = () => {
    // Validate time format (HH:MM)
    const timeRegex = /^([01]?\d|2[0-3]):([0-5]?\d)$/;
    if (timeRegex.test(keyboardValue)) {
      const [h, m] = keyboardValue.split(':');
      const formattedHours = h.padStart(2, '0');
      const formattedMinutes = m.padStart(2, '0');
      setHours(formattedHours);
      setMinutes(formattedMinutes);
      onChange(`${formattedHours}:${formattedMinutes}`);
      setIsOpen(false);
      setKeyboardMode(false);
    }
  };

  const WheelColumn = ({ items, selectedValue, onItemClick, type }) => (
    <div className="relative">
      <div 
        className="h-48 overflow-hidden relative"
        onWheel={(e) => handleWheelScroll(e, type)}
      >
        {/* Selection indicator */}
        <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 h-10 bg-blue-100 dark:bg-blue-900/30 border-y-2 border-blue-200 dark:border-blue-700 pointer-events-none z-10" />
        
        <div className="flex flex-col items-center py-20">
          {items.map((item, index) => {
            const isSelected = item === selectedValue;
            const distance = Math.abs(items.indexOf(selectedValue) - index);
            const opacity = Math.max(0.3, 1 - distance * 0.2);
            const scale = Math.max(0.8, 1 - distance * 0.1);
            
            return (
              <button
                key={item}
                type="button"
                onClick={() => onItemClick(item, type)}
                className={`
                  h-10 w-16 flex items-center justify-center text-lg font-medium transition-all duration-200 hover:bg-muted/50 rounded
                  ${isSelected ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-foreground'}
                `}
                style={{
                  opacity,
                  transform: `scale(${scale})`,
                }}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="w-full justify-start gap-2 h-10"
      >
        <Clock className="h-4 w-4" />
        {value || placeholder}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Time</DialogTitle>
          </DialogHeader>
          
          {keyboardMode ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="keyboard-time">Enter time (24h format - HH:MM)</Label>
                <Input
                  id="keyboard-time"
                  type="text"
                  placeholder="14:30"
                  value={keyboardValue}
                  onChange={handleKeyboardChange}
                  className="mt-1"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Examples: 09:30, 14:45, 23:00
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center items-center gap-4">
                <div className="text-center">
                  <Label className="text-sm font-medium mb-2 block">Hours</Label>
                  <WheelColumn
                    items={hoursArray}
                    selectedValue={hours}
                    onItemClick={handleItemClick}
                    type="hours"
                  />
                </div>
                
                <div className="text-2xl font-bold self-center mt-6">:</div>
                
                <div className="text-center">
                  <Label className="text-sm font-medium mb-2 block">Minutes</Label>
                  <WheelColumn
                    items={minutesArray}
                    selectedValue={minutes}
                    onItemClick={handleItemClick}
                    type="minutes"
                  />
                </div>
              </div>
              
              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleKeyboardInput}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Type time manually
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={keyboardMode ? handleKeyboardConfirm : handleConfirm}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimePickerWheel;
