/**
 * Utility to convert an array of JSON objects into a CSV string.
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Array of { key, label } objects defining the columns
 * @returns {string} CSV content
 */
export const convertToCSV = (data, columns) => {
  if (!data || !data.length) return '';

  const headers = columns.map(col => col.label).join(',');
  const rows = data.map(record => {
    return columns.map(col => {
      let cellValue = record[col.key] || '';
      
      // Handle dates
      if (cellValue instanceof Date) {
        cellValue = cellValue.toISOString();
      }
      
      // Escape quotes and wrap in quotes if contains comma
      const stringifiedValue = String(cellValue).replace(/"/g, '""');
      return stringifiedValue.includes(',') || stringifiedValue.includes('\n') || stringifiedValue.includes('"')
        ? `"${stringifiedValue}"`
        : stringifiedValue;
    }).join(',');
  });

  return [headers, ...rows].join('\n');
};

/**
 * Utility to trigger a browser download of a CSV file.
 * @param {string} csvContent - The CSV string content
 * @param {string} filename - The desired filename
 */
export const downloadCSV = (csvContent, filename) => {
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
