import React, { useState } from 'react';
import { Calendar } from './ui/calendar';

export function MonthlyCalendar() {
  const [date, setDate] = useState(new Date());

  return (
    <div className="w-full flex justify-center h-full">
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="w-full max-w-none"
      />
    </div>
  );
} 