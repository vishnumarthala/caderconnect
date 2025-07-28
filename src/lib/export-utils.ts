import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ExportData {
  title: string;
  headers: string[];
  data: (string | number)[][];
  summary?: {
    label: string;
    value: string | number;
  }[];
}

export const exportToPDF = (data: ExportData) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(20);
  doc.text(data.title, 20, 20);
  
  // Add timestamp
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
  
  let yPosition = 45;
  
  // Add summary if provided
  if (data.summary && data.summary.length > 0) {
    doc.setFontSize(14);
    doc.text('Summary', 20, yPosition);
    yPosition += 10;
    
    data.summary.forEach((item) => {
      doc.setFontSize(10);
      doc.text(`${item.label}: ${item.value}`, 20, yPosition);
      yPosition += 7;
    });
    
    yPosition += 10;
  }
  
  // Add data table
  autoTable(doc, {
    head: [data.headers],
    body: data.data,
    startY: yPosition,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  // Save the PDF
  doc.save(`${data.title.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.pdf`);
};

export const exportToExcel = (data: ExportData) => {
  const workbook = XLSX.utils.book_new();
  
  // Create main data worksheet
  const worksheetData = [
    data.headers,
    ...data.data
  ];
  
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Add summary sheet if provided
  if (data.summary && data.summary.length > 0) {
    const summaryData = [
      ['Summary'],
      ['Generated on:', new Date().toLocaleString()],
      [''],
      ...data.summary.map(item => [item.label, item.value])
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  }
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  
  // Save the Excel file
  XLSX.writeFile(workbook, `${data.title.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.xlsx`);
};

// Generate dummy analytics data for export
export const generateAnalyticsExportData = (): ExportData => {
  return {
    title: 'Analytics Report',
    headers: ['Metric', 'Value', 'Change', 'Period'],
    data: [
      ['Public Sentiment', '72%', '+5%', 'Last 30 days'],
      ['Media Mentions', '1,247', '+12%', 'Last 30 days'],
      ['Member Engagement', '89%', '+3%', 'Last 30 days'],
      ['Regional Performance', '8.2/10', '+0.5', 'Last 30 days'],
      ['Social Media Reach', '125K', '+8%', 'Last 30 days'],
      ['Policy Impact Score', '7.8/10', '+0.3', 'Last 30 days']
    ],
    summary: [
      { label: 'Total Metrics Tracked', value: 6 },
      { label: 'Overall Trend', value: 'Positive' },
      { label: 'Best Performing Metric', value: 'Media Mentions (+12%)' },
      { label: 'Report Period', value: 'Last 30 days' }
    ]
  };
};

// Generate dummy reports data for export
export const generateReportsExportData = (): ExportData => {
  return {
    title: 'Performance Reports',
    headers: ['Region', 'Performance Score', 'Members', 'Active Projects', 'Completion Rate'],
    data: [
      ['North', '8.5', '45', '12', '85%'],
      ['South', '7.8', '38', '10', '78%'],
      ['East', '8.1', '42', '11', '82%'],
      ['West', '7.9', '40', '9', '80%'],
      ['Central', '8.3', '35', '8', '88%']
    ],
    summary: [
      { label: 'Total Regions', value: 5 },
      { label: 'Average Performance', value: '8.1/10' },
      { label: 'Total Members', value: 200 },
      { label: 'Active Projects', value: 50 },
      { label: 'Overall Completion Rate', value: '82.6%' }
    ]
  };
};

// Generate meeting attendance data for export
export const generateAttendanceExportData = (): ExportData => {
  return {
    title: 'Meeting Attendance Report',
    headers: ['Meeting', 'Date', 'Attendees', 'Total Invited', 'Attendance Rate'],
    data: [
      ['Monthly Review - North', '2024-01-15', '12', '15', '80%'],
      ['Strategy Planning', '2024-01-20', '25', '30', '83%'],
      ['Regional Coordination', '2024-01-25', '18', '20', '90%'],
      ['Performance Review', '2024-02-01', '22', '25', '88%'],
      ['Policy Discussion', '2024-02-05', '14', '18', '78%']
    ],
    summary: [
      { label: 'Total Meetings', value: 5 },
      { label: 'Average Attendance Rate', value: '83.8%' },
      { label: 'Total Attendees', value: 91 },
      { label: 'Total Invitations Sent', value: 108 }
    ]
  };
};