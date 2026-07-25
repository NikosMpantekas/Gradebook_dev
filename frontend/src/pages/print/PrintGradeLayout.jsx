import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Download, X } from 'lucide-react';

const PrintGradeLayout = ({ 
  studentName, 
  studentEmail, 
  startDate, 
  endDate, 
  children, 
  onClose 
}) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'Δεν καθορίστηκε';
    return new Date(dateString).toLocaleDateString('el-GR', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveAsPDF = () => {
    window.print();
  };

  return (
    <div className="bg-slate-100 min-h-screen text-slate-900 dark:bg-slate-900 dark:text-slate-100 print:bg-white print:text-black">
      {/* Print Controls - hidden when printing */}
      <div className="sticky top-0 z-50 bg-primary text-primary-foreground p-4 mb-4 flex items-center justify-between shadow-md print:hidden">
        <h2 className="text-lg font-semibold">Αναφορά Βαθμολογίας</h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Εκτύπωση
          </Button>
          <Button variant="secondary" size="sm" onClick={handleSaveAsPDF}>
            <Download className="mr-2 h-4 w-4" />
            Αποθήκευση ως PDF
          </Button>
          <Button variant="destructive" size="sm" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Κλείσιμο
          </Button>
        </div>
      </div>

      {/* Main Printable Content */}
      <div className="max-w-[1000px] mx-auto bg-white dark:bg-slate-850 p-8 shadow-sm border rounded-lg print:max-w-none print:w-full print:p-2 print:border-none print:shadow-none print:bg-white print:text-black">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-1">
            Ακαδημαϊκή Αναφορά Βαθμολογίας
          </h1>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 print:text-black mb-1">
            {studentName || 'Όνομα Μαθητή'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 print:text-slate-600 mb-1">
            {studentEmail || 'Email Μαθητή'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600">
            Περίοδος: {formatDate(startDate)} - {formatDate(endDate)}
          </p>
        </div>

        <div className="border-b my-6 print:my-3" />

        {children}

        <div className="border-b my-6 print:my-3" />

        <div className="text-center text-xs text-slate-500 dark:text-slate-400 print:text-slate-600 space-y-1">
          <p>
            Η αναφορά δημιουργήθηκε στις {new Date().toLocaleDateString('el-GR')} στις {new Date().toLocaleTimeString('el-GR')}
          </p>
          <p className="text-[10px]">
            Σύστημα Αναφορών GradeBook | Ακαδημαϊκό Έτος 2025
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrintGradeLayout;
