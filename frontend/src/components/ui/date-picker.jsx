import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

const DatePicker = React.forwardRef(({ 
  className, 
  placeholder = "Pick a date", 
  value, 
  onChange, 
  disabled = false,
  min,
  max,
  ...props 
}, ref) => {
  const [date, setDate] = React.useState(value ? new Date(value) : undefined)

  React.useEffect(() => {
    if (value) {
      setDate(new Date(value))
    } else {
      setDate(undefined)
    }
  }, [value])

  const handleSelect = (selectedDate) => {
    setDate(selectedDate)
    if (onChange) {
      onChange(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '')
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal hover:bg-accent hover:text-accent-foreground",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          {...props}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
          captionLayout="dropdown"
          fromYear={min ? new Date(min).getFullYear() - 10 : 2000}
          toYear={max ? new Date(max).getFullYear() + 10 : 2035}
          showOutsideDays={false}
          disabled={(date) => {
            if (min && date < new Date(min)) return true
            if (max && date > new Date(max)) return true
            return false
          }}
        />
        <div className="p-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full hover:bg-accent hover:text-accent-foreground"
            onClick={() => handleSelect(new Date())}
          >
            Today
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
})

DatePicker.displayName = "DatePicker"

export { DatePicker }
