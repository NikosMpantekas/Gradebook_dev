import * as React from "react"
import { Clock } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Input } from "./input"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { ScrollArea } from "./scroll-area"

const TimePicker = React.forwardRef(({ 
  className, 
  placeholder = "Select time (24h)",
  value, 
  onChange, 
  disabled = false,
  ...props 
}, ref) => {
  const [time, setTime] = React.useState(value || "")
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    if (value) {
      setTime(value)
    } else {
      setTime("")
    }
  }, [value])

  const handleTimeSelect = (selectedTime) => {
    setTime(selectedTime)
    if (onChange) {
      onChange(selectedTime)
    }
    setIsOpen(false)
  }

  const handleInputChange = (e) => {
    const inputValue = e.target.value
    setTime(inputValue)
    
    // Validate time format and call onChange if valid
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/
    if (timeRegex.test(inputValue) || inputValue === "") {
      if (onChange) {
        onChange(inputValue)
      }
    }
  }

  const generateTimeOptions = () => {
    const times = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        times.push(timeString)
      }
    }
    return times
  }

  const formatDisplayTime = (timeString) => {
    if (!timeString) return placeholder
    return timeString
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal hover:bg-accent hover:text-accent-foreground",
            !time && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          {...props}
        >
          <Clock className="mr-2 h-4 w-4" />
          {formatDisplayTime(time)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 border-b border-border">
          <Input
            placeholder="HH:MM (24-hour)"
            value={time}
            onChange={handleInputChange}
            className="font-mono text-center"
            maxLength={5}
          />
        </div>
        <ScrollArea className="h-60 w-full">
          <div className="grid grid-cols-1 gap-0">
            {generateTimeOptions().map((timeOption) => (
              <Button
                key={timeOption}
                variant="ghost"
                className={cn(
                  "w-full justify-start font-mono text-sm hover:bg-accent hover:text-accent-foreground",
                  time === timeOption && "bg-accent text-accent-foreground"
                )}
                onClick={() => handleTimeSelect(timeOption)}
              >
                {formatDisplayTime(timeOption)}
              </Button>
            ))}
          </div>
        </ScrollArea>
        <div className="p-3 border-t border-border flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              const now = new Date()
              const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
              handleTimeSelect(currentTime)
            }}
          >
            Now
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 hover:bg-accent hover:text-accent-foreground"
            onClick={() => handleTimeSelect("")}
          >
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
})

TimePicker.displayName = "TimePicker"

export { TimePicker }