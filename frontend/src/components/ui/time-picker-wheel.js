import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog';
import { Clock } from 'lucide-react';

const TimePickerWheel = ({ value, onChange, placeholder = "Select time", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState(12);
  const [minutes, setMinutes] = useState(0);
  const [keyboardInput, setKeyboardInput] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);
  
  const hoursWheelRef = useRef(null);
  const minutesWheelRef = useRef(null);
  const hoursScrollRef = useRef(null);
  const minutesScrollRef = useRef(null);
  const itemHeight = 44;
  const visibleItems = 5;
  const centerIndex = Math.floor(visibleItems / 2);

  // Initialize from value prop
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      setHours(h);
      setMinutes(m);
    }
  }, [value]);

  // Create infinite arrays with padding
  const createInfiniteArray = (max) => {
    const baseArray = Array.from({ length: max }, (_, i) => i);
    // Add padding items for smooth infinite scrolling
    const padding = visibleItems * 3;
    const infiniteArray = [];
    
    for (let i = -padding; i < max + padding; i++) {
      infiniteArray.push(((i % max) + max) % max);
    }
    return infiniteArray;
  };

  const hoursArray = createInfiniteArray(24);
  const minutesArray = createInfiniteArray(60);

  const scrollToValue = useCallback((wheelRef, scrollRef, value, max) => {
    if (!wheelRef.current || !scrollRef.current) return;
    
    const padding = visibleItems * 3;
    const targetIndex = padding + value;
    const scrollTop = (targetIndex - centerIndex) * itemHeight;
    
    scrollRef.current.scrollTop = scrollTop;
  }, [centerIndex, itemHeight, visibleItems]);

  // Scroll to initial values when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollToValue(hoursWheelRef, hoursScrollRef, hours, 24);
        scrollToValue(minutesWheelRef, minutesScrollRef, minutes, 60);
      }, 50);
    }
  }, [isOpen, hours, minutes, scrollToValue]);

  const handleScroll = useCallback((scrollRef, setValue, max) => {
    if (!scrollRef.current) return;
    
    const scrollTop = scrollRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight) + centerIndex;
    const padding = visibleItems * 3;
    const actualValue = ((index - padding) % max + max) % max;
    
    setValue(actualValue);
  }, [centerIndex, itemHeight, visibleItems]);

  const onHoursScroll = useCallback(() => {
    handleScroll(hoursScrollRef, setHours, 24);
  }, [handleScroll]);

  const onMinutesScroll = useCallback(() => {
    handleScroll(minutesScrollRef, setMinutes, 60);
  }, [handleScroll]);

  // Handle infinite scrolling
  const handleInfiniteScroll = useCallback((scrollRef, max) => {
    if (!scrollRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const padding = visibleItems * 3;
    const itemsPerCycle = max;
    const cycleHeight = itemsPerCycle * itemHeight;
    
    // Reset scroll position when reaching boundaries for infinite effect
    if (scrollTop < cycleHeight) {
      scrollRef.current.scrollTop = scrollTop + cycleHeight;
    } else if (scrollTop > scrollHeight - clientHeight - cycleHeight) {
      scrollRef.current.scrollTop = scrollTop - cycleHeight;
    }
  }, [itemHeight, visibleItems]);

  const WheelColumn = ({ items, selectedValue, scrollRef, onScroll, onInfiniteScroll, max }) => (
    <div className="relative w-20">
      {/* Selection indicator */}
      <div 
        className="absolute inset-x-0 bg-gray-200 dark:bg-gray-700 rounded-lg pointer-events-none z-10"
        style={{
          top: `${centerIndex * itemHeight}px`,
          height: `${itemHeight}px`,
        }}
      />
      
      <div
        ref={scrollRef}
        className="h-220 overflow-y-scroll scrollbar-hide"
        style={{ height: `${visibleItems * itemHeight}px` }}
        onScroll={() => {
          onScroll();
          onInfiniteScroll(scrollRef, max);
        }}
      >
        <div className="relative">
          {items.map((item, index) => {
            const isSelected = item === selectedValue;
            const distanceFromCenter = Math.abs(index - centerIndex - Math.round(scrollRef.current?.scrollTop / itemHeight || 0));
            const opacity = Math.max(0.3, 1 - distanceFromCenter * 0.15);
            const scale = Math.max(0.85, 1 - distanceFromCenter * 0.05);
            
            return (
              <div
                key={`${item}-${index}`}
                className={`
                  flex items-center justify-center text-lg font-medium transition-all duration-100
                  ${isSelected ? 'text-foreground' : 'text-muted-foreground'}
                `}
                style={{
                  height: `${itemHeight}px`,
                  opacity,
                  transform: `scale(${scale})`,
                }}
              >
                {item.toString().padStart(2, '0')}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const handleTimeClick = () => {
    setShowKeyboard(true);
    setKeyboardInput(value || `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
  };

  const handleKeyboardChange = (e) => {
    let input = e.target.value.replace(/[^\d:]/g, '');
    
    // Auto-format as user types
    if (input.length === 2 && !input.includes(':')) {
      input += ':';
    }
    
    // Limit to HH:MM format
    if (input.length > 5) {
      input = input.slice(0, 5);
    }
    
    setKeyboardInput(input);
  };

  const handleKeyboardSubmit = () => {
    const timeRegex = /^([01]?\d|2[0-3]):([0-5]?\d)$/;
    if (timeRegex.test(keyboardInput)) {
      const [h, m] = keyboardInput.split(':').map(Number);
      setHours(h);
      setMinutes(m);
      onChange(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      setIsOpen(false);
      setShowKeyboard(false);
    }
  };

  const handleConfirm = () => {
    const timeValue = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    onChange(timeValue);
    setIsOpen(false);
    setShowKeyboard(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setShowKeyboard(false);
  };

  const displayTime = value || `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="w-full justify-start gap-2 h-10 font-mono"
      >
        <Clock className="h-4 w-4" />
        {displayTime}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Time</DialogTitle>
          </DialogHeader>
          
          {showKeyboard ? (
            <div className="space-y-4">
              <div className="text-center">
                <Input
                  type="text"
                  placeholder="HH:MM"
                  value={keyboardInput}
                  onChange={handleKeyboardChange}
                  className="text-center text-xl font-mono"
                  autoFocus
                  maxLength={5}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  24-hour format (00:00 - 23:59)
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Clickable time display */}
              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleTimeClick}
                  className="text-2xl font-mono hover:bg-muted/50 px-4 py-2"
                >
                  {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Click to type manually
                </p>
              </div>
              
              {/* Wheel picker */}
              <div className="flex justify-center items-center gap-4">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-2">Hours</div>
                  <WheelColumn
                    items={hoursArray}
                    selectedValue={hours}
                    scrollRef={hoursScrollRef}
                    onScroll={onHoursScroll}
                    onInfiniteScroll={handleInfiniteScroll}
                    max={24}
                  />
                </div>
                
                <div className="text-xl font-bold mt-6">:</div>
                
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-2">Minutes</div>
                  <WheelColumn
                    items={minutesArray}
                    selectedValue={minutes}
                    scrollRef={minutesScrollRef}
                    onScroll={onMinutesScroll}
                    onInfiniteScroll={handleInfiniteScroll}
                    max={60}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={showKeyboard ? handleKeyboardSubmit : handleConfirm}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <style jsx>{`
        .h-220 {
          height: 220px;
        }
        .scrollbar-hide {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default TimePickerWheel;
