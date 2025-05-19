import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle, Table, TableRow, TableCell } from "docx";
import { saveAs } from "file-saver";

interface Question {
  id: number;
  type: string;
  text: string;
  options?: string[];
  points: number;
  order: number;
}

interface Exam {
  id: number;
  title: string;
  subject: string;
  description?: string;
  duration: number;
  questions: Question[];
}

// Helper function to add RTL text to PDF
function addRTLText(doc: jsPDF, text: string, x: number, y: number, options?: any) {
  const arabicText = text.split('').reverse().join('');
  doc.text(arabicText, x, y, { ...options, align: "right" });
}

// Helper function to convert points to grade display format
function pointsToGrade(points: number): string {
  if (points === 1) {
    return `(${points} درجة)`;
  } else {
    return `(${points} درجات)`;
  }
}

// Export exam to PDF
export function exportToPDF(exam: Exam): void {
  // Create a new document
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  
  // Set right-to-left mode
  doc.setR2L(true);
  
  // Add fonts for Arabic (assumes using built-in fonts that support Arabic)
  doc.setFont("Helvetica", "bold");
  
  // Header
  doc.setFontSize(24);
  doc.text(exam.title, doc.internal.pageSize.getWidth() / 2, 20, { align: "center" });
  
  doc.setFontSize(16);
  doc.text(exam.subject, doc.internal.pageSize.getWidth() / 2, 30, { align: "center" });
  
  doc.setFontSize(12);
  doc.text(`المدة: ${exam.duration} دقيقة`, doc.internal.pageSize.getWidth() / 2, 40, { align: "center" });
  
  // Description if available
  if (exam.description) {
    doc.setFontSize(10);
    doc.text(exam.description, doc.internal.pageSize.getWidth() / 2, 50, { align: "center" });
  }
  
  // Horizontal line
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setLineWidth(0.5);
  doc.line(10, 55, pageWidth - 10, 55);
  
  // Instructions
  doc.setFontSize(12);
  doc.setFont("Helvetica", "bold");
  doc.text("تعليمات:", 190, 65);
  
  doc.setFontSize(10);
  doc.setFont("Helvetica", "normal");
  doc.text("• اقرأ الأسئلة بعناية قبل الإجابة عليها.", 190, 72);
  doc.text("• أجب على جميع الأسئلة.", 190, 78);
  doc.text("• تأكد من كتابة اسمك ورقمك على ورقة الإجابة.", 190, 84);
  
  // Questions
  let yPosition = 100;
  const lineHeight = 7;
  
  exam.questions.forEach((question, index) => {
    // Check if we need a new page
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Question number and text
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`السؤال ${index + 1} ${pointsToGrade(question.points)}:`, 190, yPosition);
    
    yPosition += lineHeight;
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(11);
    
    // Split long text into multiple lines
    const textLines = doc.splitTextToSize(question.text, 170);
    doc.text(textLines, 190, yPosition);
    
    yPosition += textLines.length * lineHeight;
    
    // For multiple choice questions, add options
    if (question.type === "multiple_choice" && question.options) {
      yPosition += lineHeight / 2;
      
      question.options.forEach((option, optIndex) => {
        const optionText = `${String.fromCharCode(65 + optIndex)}) ${option}`;
        doc.text(optionText, 180, yPosition);
        yPosition += lineHeight;
      });
    }
    
    // For true/false questions
    if (question.type === "true_false") {
      yPosition += lineHeight / 2;
      doc.text("صح □", 150, yPosition);
      doc.text("خطأ □", 120, yPosition);
      yPosition += lineHeight;
    }
    
    // For essay questions, add lines for answers
    if (question.type === "essay") {
      yPosition += lineHeight;
      
      for (let i = 0; i < 5; i++) {
        doc.setDrawColor(200, 200, 200);
        doc.line(20, yPosition, 190, yPosition);
        yPosition += lineHeight;
      }
    }
    
    yPosition += lineHeight; // Add space between questions
  });
  
  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setFont("Helvetica", "italic");
    doc.text(`الصفحة ${i} من ${totalPages}`, pageWidth / 2, 287, { align: "center" });
  }
  
  // Save the PDF
  doc.save(`${exam.title}.pdf`);
}

// Export exam to Word
export async function exportToWord(exam: Exam): Promise<void> {
  // Create a new document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              right: 1000,
              bottom: 1000,
              left: 1000,
            },
          },
        },
        children: [
          // Exam Title
          new Paragraph({
            text: exam.title,
            heading: HeadingLevel.HEADING_1,
            alignment: "center",
            bidirectional: true,
          }),
          
          // Subject
          new Paragraph({
            text: exam.subject,
            heading: HeadingLevel.HEADING_2,
            alignment: "center",
            bidirectional: true,
          }),
          
          // Duration
          new Paragraph({
            text: `المدة: ${exam.duration} دقيقة`,
            alignment: "center",
            bidirectional: true,
          }),
          
          // Description if available
          ...(exam.description
            ? [
                new Paragraph({
                  text: exam.description,
                  alignment: "center",
                  bidirectional: true,
                }),
              ]
            : []),
          
          // Separator
          new Paragraph({
            text: "─".repeat(50),
            alignment: "center",
          }),
          
          // Instructions
          new Paragraph({
            text: "تعليمات:",
            heading: HeadingLevel.HEADING_3,
            bidirectional: true,
          }),
          
          new Paragraph({
            text: "• اقرأ الأسئلة بعناية قبل الإجابة عليها.",
            bidirectional: true,
          }),
          
          new Paragraph({
            text: "• أجب على جميع الأسئلة.",
            bidirectional: true,
          }),
          
          new Paragraph({
            text: "• تأكد من كتابة اسمك ورقمك على ورقة الإجابة.",
            bidirectional: true,
          }),
          
          new Paragraph({
            text: "",
          }),
          
          // Questions
          ...exam.questions.map((question, index) => {
            const questionParagraphs = [
              // Question number and text
              new Paragraph({
                text: `السؤال ${index + 1} ${pointsToGrade(question.points)}:`,
                heading: HeadingLevel.HEADING_3,
                bidirectional: true,
              }),
              
              new Paragraph({
                text: question.text,
                bidirectional: true,
              }),
            ];
            
            // For multiple choice questions, add options
            if (question.type === "multiple_choice" && question.options) {
              question.options.forEach((option, optIndex) => {
                questionParagraphs.push(
                  new Paragraph({
                    text: `${String.fromCharCode(65 + optIndex)}) ${option}`,
                    bidirectional: true,
                  })
                );
              });
            }
            
            // For true/false questions
            if (question.type === "true_false") {
              questionParagraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "صح □     خطأ □",
                      bidirectional: true,
                    }),
                  ],
                })
              );
            }
            
            // For essay questions, add a table for answers
            if (question.type === "essay") {
              const rows = [];
              for (let i = 0; i < 5; i++) {
                rows.push(
                  new TableRow({
                    children: [
                      new TableCell({
                        borders: {
                          top: { style: BorderStyle.NONE },
                          bottom: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
                          left: { style: BorderStyle.NONE },
                          right: { style: BorderStyle.NONE },
                        },
                        children: [new Paragraph("")],
                      }),
                    ],
                  })
                );
              }
              
              questionParagraphs.push(
                new Table({
                  width: {
                    size: 100,
                    type: "pct",
                  },
                  rows,
                })
              );
            }
            
            // Add space between questions
            questionParagraphs.push(new Paragraph({ text: "" }));
            
            return questionParagraphs;
          }).flat(),
        ],
      },
    ],
  });
  
  // Generate and save document
  const buffer = await Packer.toBuffer(doc);
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  saveAs(blob, `${exam.title}.docx`);
}
