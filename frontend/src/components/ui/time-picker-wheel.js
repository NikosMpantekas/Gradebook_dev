import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './dialog';
import { Clock } from 'lucide-react';

const TimePickerWheel = ({ value, onChange, placeholder = "Select time", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [keyboardInput, setKeyboardInput] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);

  // Initialize from value prop
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      setHours(h || 0);
      setMinutes(m || 0);
    }
  }, [value]);

  // Fixed wheel component with proper center selection
  const WheelPicker = ({ max, selectedValue, onChange: onValueChange, label }) => {
    const containerRef = useRef(null);
    const itemHeight = 40;
    const visibleItems = 7;
    const centerIndex = 3; // Middle item position (0,1,2,[3],4,5,6)
    const resetingRef = useRef(false);
    
    // Create array with multiple cycles for infinite scroll
    const items = [];
    const cycles = 5;
    for (let i = 0; i < max * cycles; i++) {
      items.push(i % max);
    }
    
    const scrollToItem = (targetValue) => {
      if (!containerRef.current) return;
      // Find target value in middle cycle to avoid boundary issues
      const middleCycleStart = Math.floor(cycles / 2) * max;
      const targetIndex = middleCycleStart + targetValue;
      const scrollTop = (targetIndex - centerIndex) * itemHeight;
      resetingRef.current = true;
      containerRef.current.scrollTop = scrollTop;
      setTimeout(() => { resetingRef.current = false; }, 100);
    };
    
    // Initialize scroll position when dialog opens
    useEffect(() => {
      if (isOpen) {
        setTimeout(() => scrollToItem(selectedValue), 100);
      }
    }, [isOpen, selectedValue]);
    
    const handleScroll = () => {
      if (!containerRef.current || resetingRef.current) return;
      
      const scrollTop = containerRef.current.scrollTop;
      
      // Simple and correct calculation:
      // How many full items have we scrolled past?
      const itemsScrolled = Math.round(scrollTop / itemHeight);
      // The item at the center is the one at centerIndex + itemsScrolled
      const centerItemIndex = centerIndex + itemsScrolled;
      
      // Get the value and update only if it's different
      if (centerItemIndex >= 0 && centerItemIndex < items.length) {
        const newValue = items[centerItemIndex];
        if (newValue !== selectedValue) {
          onValueChange(newValue);
        }
      }
      
      // Handle infinite scroll - only when approaching actual boundaries
      const totalHeight = items.length * itemHeight;
      const containerHeight = visibleItems * itemHeight;
      const cycleHeight = max * itemHeight;
      
      // Reset when we get close to the actual start/end
      if (scrollTop < cycleHeight * 0.5) {
        resetingRef.current = true;
        containerRef.current.scrollTop = scrollTop + cycleHeight;
        setTimeout(() => { resetingRef.current = false; }, 50);
      } else if (scrollTop > totalHeight - containerHeight - cycleHeight * 0.5) {
        resetingRef.current = true;
        containerRef.current.scrollTop = scrollTop - cycleHeight;
        setTimeout(() => { resetingRef.current = false; }, 50);
      }
    };
    
    return (
      <div className="flex flex-col items-center">
        <div className="text-xs text-muted-foreground mb-2">{label}</div>
        <div className="relative">
          {/* Selection highlight */}
          <div 
            className="absolute left-0 right-0 bg-blue-100 dark:bg-blue-900/30 border-y border-blue-300 dark:border-blue-600 pointer-events-none z-10"
            style={{
              top: `${centerIndex * itemHeight}px`,
              height: `${itemHeight}px`,
            }}
          />
          
          <div
            ref={containerRef}
            style={{
              height: `${visibleItems * itemHeight}px`,
              width: '80px',
              overflowY: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
            onScroll={handleScroll}
          >
            <style jsx>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            {items.map((item, index) => {
              const scrollTop = containerRef.current?.scrollTop || 0;
              const currentCenter = Math.round(scrollTop / itemHeight) + centerIndex;
              const distance = Math.abs(index - currentCenter);
              const opacity = Math.max(0.3, 1 - distance * 0.15);
              const scale = Math.max(0.85, 1 - distance * 0.05);
              
              return (
                <div
                  key={`${item}-${index}`}
                  className="flex items-center justify-center text-lg font-mono cursor-pointer select-none hover:bg-muted/20"
                  style={{
                    height: `${itemHeight}px`,
                    opacity,
                    transform: `scale(${scale})`,
                    transition: 'all 0.1s ease',
                  }}
                  onClick={() => {
                    const targetScroll = (index - centerIndex) * itemHeight;
                    containerRef.current?.scrollTo({ top: targetScroll, behavior: 'smooth' });
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
  };

  const handleTimeClick = () => {
    setShowKeyboard(true);
    setKeyboardInput(value || `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
  };

  const handleKeyboardChange = (e) => {
    let input = e.target.value.replace(/[^\d:]/g, '');
    
    // Auto-format: add colon after 2 digits
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
      setShowKeyboard(false);
    }
  };

  const handleConfirm = () => {
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    onChange(timeString);
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
            <DialogDescription>
              Choose time using the wheel picker or click the time to type manually
            </DialogDescription>
          </DialogHeader>
          
          {showKeyboard ? (
            <div className="space-y-4">
              <div className="text-center">
                <Input
                  type="text"
                  placeholder="HH:MM"
                  value={keyboardInput}
                  onChange={handleKeyboardChange}
                  className="text-center text-2xl font-mono"
                  maxLength={5}
                  autoFocus
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Enter time in 24-hour format (00:00 - 23:59)
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowKeyboard(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleKeyboardSubmit}
                  className="flex-1"
                >
                  Set Time
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div 
                className="text-center text-3xl font-mono cursor-pointer p-3 rounded-lg hover:bg-muted transition-colors"
                onClick={handleTimeClick}
                title="Click to type time manually"
              >
                {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Click time above to type manually
              </p>
              
              <div className="flex justify-center space-x-8">
                <WheelPicker 
                  max={24} 
                  selectedValue={hours} 
                  onChange={setHours} 
                  label="Hours"
                />
                <WheelPicker 
                  max={60} 
                  selectedValue={minutes} 
                  onChange={setMinutes} 
                  label="Minutes"
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleCancel}
            >
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
    </div>
  );
};

export default TimePickerWheel;
