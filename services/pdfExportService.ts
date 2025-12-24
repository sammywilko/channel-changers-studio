/**
 * DIRECTOR - Storyboard PDF Export Service
 * 
 * Generates production-ready PDF storyboards from beat structures.
 * Uses jsPDF with professional layout.
 */

import jsPDF from 'jspdf';
import { EpisodeStructure, Beat, Project } from '../types';

// ============================================
// TYPES
// ============================================

export interface PDFExportOptions {
  includePrompts?: boolean;
  includeDialogue?: boolean;
  includeCameraInfo?: boolean;
  includeComments?: boolean;
  paperSize?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  shotsPerPage?: 2 | 4 | 6;
  projectName?: string;
  clientName?: string;
  version?: string;
}

// ============================================
// CONSTANTS
// ============================================

const COLORS = {
  primary: '#1a365d',      // Deep blue
  accent: '#ed8936',       // Warm orange
  text: '#2d3748',         // Neutral gray
  lightGray: '#e2e8f0',
  white: '#ffffff',
};

const FONT_SIZES = {
  title: 24,
  heading: 14,
  subheading: 11,
  body: 9,
  caption: 8,
};

// ============================================
// MAIN EXPORT FUNCTION
// ============================================

export const exportStoryboardPDF = async (
  project: Project,
  options: PDFExportOptions = {}
): Promise<Blob> => {
  const {
    includePrompts = true,
    includeDialogue = true,
    includeCameraInfo = true,
    includeComments = false,
    paperSize = 'a4',
    orientation = 'landscape',
    shotsPerPage = 4,
    projectName = project.name,
    clientName = '',
    version = '1.0',
  } = options;

  if (!project.structure) {
    throw new Error('No storyboard structure to export');
  }

  // Initialize PDF
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: paperSize,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  // ============================================
  // COVER PAGE
  // ============================================

  addCoverPage(doc, {
    title: projectName,
    subtitle: project.type === 'product' ? 'Product Shot List' : 'Storyboard',
    client: clientName,
    version,
    date: new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    pageWidth,
    pageHeight,
    margin,
  });

  // ============================================
  // STORYBOARD PAGES
  // ============================================

  // Flatten all beats
  const allBeats: { beat: Beat; actNum: number; sceneNum: number; sceneSummary: string }[] = [];
  
  project.structure.acts.forEach(act => {
    act.scenes.forEach(scene => {
      scene.beats.forEach(beat => {
        if (beat.generatedImages?.length > 0 && beat.selectedImageIndex >= 0) {
          allBeats.push({
            beat,
            actNum: act.act_number,
            sceneNum: scene.scene_number,
            sceneSummary: scene.summary,
          });
        }
      });
    });
  });

  // Calculate layout based on shots per page
  const layout = getLayout(shotsPerPage, orientation, pageWidth, pageHeight, margin);

  // Generate pages
  let shotIndex = 0;
  let pageNum = 1;

  while (shotIndex < allBeats.length) {
    doc.addPage();
    pageNum++;

    // Page header
    addPageHeader(doc, {
      projectName,
      pageNum,
      totalPages: Math.ceil(allBeats.length / shotsPerPage) + 1,
      margin,
      pageWidth,
    });

    // Add shots to page
    for (let slot = 0; slot < shotsPerPage && shotIndex < allBeats.length; slot++) {
      const { beat, actNum, sceneNum, sceneSummary } = allBeats[shotIndex];
      const position = layout.slots[slot];

      await addShotToPage(doc, {
        beat,
        actNum,
        sceneNum,
        sceneSummary,
        position,
        includePrompts,
        includeDialogue,
        includeCameraInfo,
        includeComments,
        isProduct: project.type === 'product',
      });

      shotIndex++;
    }

    // Page footer
    addPageFooter(doc, {
      pageNum,
      margin,
      pageWidth,
      pageHeight,
    });
  }

  // Return as blob
  return doc.output('blob');
};

// ============================================
// COVER PAGE
// ============================================

const addCoverPage = (
  doc: jsPDF,
  opts: {
    title: string;
    subtitle: string;
    client: string;
    version: string;
    date: string;
    pageWidth: number;
    pageHeight: number;
    margin: number;
  }
) => {
  const centerX = opts.pageWidth / 2;

  // Background
  doc.setFillColor(COLORS.primary);
  doc.rect(0, 0, opts.pageWidth, opts.pageHeight * 0.4, 'F');

  // Title
  doc.setTextColor(COLORS.white);
  doc.setFontSize(FONT_SIZES.title);
  doc.setFont('helvetica', 'bold');
  doc.text(opts.title, centerX, opts.pageHeight * 0.2, { align: 'center' });

  // Subtitle
  doc.setFontSize(FONT_SIZES.heading);
  doc.setFont('helvetica', 'normal');
  doc.text(opts.subtitle, centerX, opts.pageHeight * 0.28, { align: 'center' });

  // Metadata section
  doc.setTextColor(COLORS.text);
  const metaY = opts.pageHeight * 0.55;

  if (opts.client) {
    doc.setFontSize(FONT_SIZES.subheading);
    doc.setFont('helvetica', 'bold');
    doc.text('Client:', opts.margin + 20, metaY);
    doc.setFont('helvetica', 'normal');
    doc.text(opts.client, opts.margin + 45, metaY);
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Version:', opts.margin + 20, metaY + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(opts.version, opts.margin + 45, metaY + 10);

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', opts.margin + 20, metaY + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(opts.date, opts.margin + 45, metaY + 20);

  // Footer
  doc.setFontSize(FONT_SIZES.caption);
  doc.setTextColor(COLORS.lightGray);
  doc.text('Generated by Director • Channel Changers', centerX, opts.pageHeight - 10, { align: 'center' });
};

// ============================================
// PAGE HEADER/FOOTER
// ============================================

const addPageHeader = (
  doc: jsPDF,
  opts: {
    projectName: string;
    pageNum: number;
    totalPages: number;
    margin: number;
    pageWidth: number;
  }
) => {
  doc.setFillColor(COLORS.primary);
  doc.rect(0, 0, opts.pageWidth, 12, 'F');

  doc.setTextColor(COLORS.white);
  doc.setFontSize(FONT_SIZES.body);
  doc.setFont('helvetica', 'bold');
  doc.text(opts.projectName, opts.margin, 8);

  doc.setFont('helvetica', 'normal');
  doc.text(`Page ${opts.pageNum} of ${opts.totalPages}`, opts.pageWidth - opts.margin, 8, { align: 'right' });
};

const addPageFooter = (
  doc: jsPDF,
  opts: {
    pageNum: number;
    margin: number;
    pageWidth: number;
    pageHeight: number;
  }
) => {
  doc.setDrawColor(COLORS.lightGray);
  doc.line(opts.margin, opts.pageHeight - 8, opts.pageWidth - opts.margin, opts.pageHeight - 8);

  doc.setTextColor(COLORS.text);
  doc.setFontSize(FONT_SIZES.caption);
  doc.text('CONFIDENTIAL - For Internal Review Only', opts.pageWidth / 2, opts.pageHeight - 4, { align: 'center' });
};

// ============================================
// SHOT LAYOUT
// ============================================

interface SlotPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  imageHeight: number;
  textY: number;
}

interface Layout {
  slots: SlotPosition[];
}

const getLayout = (
  shotsPerPage: number,
  orientation: string,
  pageWidth: number,
  pageHeight: number,
  margin: number
): Layout => {
  const contentTop = 16; // After header
  const contentBottom = pageHeight - 12; // Before footer
  const contentHeight = contentBottom - contentTop;
  const contentWidth = pageWidth - margin * 2;

  const slots: SlotPosition[] = [];

  if (shotsPerPage === 2) {
    // 2 shots side by side
    const shotWidth = (contentWidth - 10) / 2;
    const shotHeight = contentHeight - 10;
    const imageHeight = shotHeight * 0.6;

    slots.push({
      x: margin,
      y: contentTop + 5,
      width: shotWidth,
      height: shotHeight,
      imageHeight,
      textY: contentTop + 5 + imageHeight + 5,
    });

    slots.push({
      x: margin + shotWidth + 10,
      y: contentTop + 5,
      width: shotWidth,
      height: shotHeight,
      imageHeight,
      textY: contentTop + 5 + imageHeight + 5,
    });
  } else if (shotsPerPage === 4) {
    // 2x2 grid
    const shotWidth = (contentWidth - 10) / 2;
    const shotHeight = (contentHeight - 10) / 2;
    const imageHeight = shotHeight * 0.55;

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const x = margin + col * (shotWidth + 10);
        const y = contentTop + 5 + row * (shotHeight + 5);
        slots.push({
          x,
          y,
          width: shotWidth,
          height: shotHeight,
          imageHeight,
          textY: y + imageHeight + 3,
        });
      }
    }
  } else if (shotsPerPage === 6) {
    // 3x2 grid
    const shotWidth = (contentWidth - 20) / 3;
    const shotHeight = (contentHeight - 10) / 2;
    const imageHeight = shotHeight * 0.5;

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const x = margin + col * (shotWidth + 10);
        const y = contentTop + 5 + row * (shotHeight + 5);
        slots.push({
          x,
          y,
          width: shotWidth,
          height: shotHeight,
          imageHeight,
          textY: y + imageHeight + 2,
        });
      }
    }
  }

  return { slots };
};

// ============================================
// ADD SHOT TO PAGE
// ============================================

const addShotToPage = async (
  doc: jsPDF,
  opts: {
    beat: Beat;
    actNum: number;
    sceneNum: number;
    sceneSummary: string;
    position: SlotPosition;
    includePrompts: boolean;
    includeDialogue: boolean;
    includeCameraInfo: boolean;
    includeComments: boolean;
    isProduct: boolean;
  }
) => {
  const { beat, position, isProduct } = opts;

  // Border
  doc.setDrawColor(COLORS.lightGray);
  doc.setLineWidth(0.3);
  doc.rect(position.x, position.y, position.width, position.height);

  // Shot number badge
  doc.setFillColor(COLORS.accent);
  doc.roundedRect(position.x, position.y, 20, 6, 1, 1, 'F');
  doc.setTextColor(COLORS.white);
  doc.setFontSize(FONT_SIZES.caption);
  doc.setFont('helvetica', 'bold');
  doc.text(beat.beat_id.replace('beat_', '#'), position.x + 10, position.y + 4, { align: 'center' });

  // Scene info
  doc.setTextColor(COLORS.text);
  doc.setFontSize(FONT_SIZES.caption);
  doc.setFont('helvetica', 'normal');
  const sceneLabel = isProduct
    ? `Collection ${opts.actNum} • ${opts.sceneSummary}`
    : `Act ${opts.actNum} Scene ${opts.sceneNum}`;
  doc.text(sceneLabel, position.x + 22, position.y + 4);

  // Image placeholder
  const imageY = position.y + 8;
  const imageX = position.x + 2;
  const imageWidth = position.width - 4;
  const imageHeight = position.imageHeight - 10;

  // Try to add the image
  if (beat.generatedImages && beat.selectedImageIndex >= 0) {
    const imageData = beat.generatedImages[beat.selectedImageIndex];
    try {
      const aspectRatio = 16 / 9;
      let fitWidth = imageWidth;
      let fitHeight = fitWidth / aspectRatio;

      if (fitHeight > imageHeight) {
        fitHeight = imageHeight;
        fitWidth = fitHeight * aspectRatio;
      }

      const centerX = imageX + (imageWidth - fitWidth) / 2;

      doc.addImage(imageData, 'PNG', centerX, imageY, fitWidth, fitHeight);
    } catch (e) {
      doc.setFillColor('#f0f0f0');
      doc.rect(imageX, imageY, imageWidth, imageHeight, 'F');
      doc.setTextColor('#999999');
      doc.setFontSize(FONT_SIZES.body);
      doc.text('Image', position.x + position.width / 2, imageY + imageHeight / 2, { align: 'center' });
    }
  } else {
    doc.setFillColor('#f0f0f0');
    doc.rect(imageX, imageY, imageWidth, imageHeight, 'F');
  }

  // Text content
  let textY = position.textY;
  const maxTextWidth = position.width - 4;

  // Action/description
  doc.setTextColor(COLORS.text);
  doc.setFontSize(FONT_SIZES.body);
  doc.setFont('helvetica', 'bold');

  const actionLines = doc.splitTextToSize(beat.action, maxTextWidth);
  const maxActionLines = 2;
  const displayActionLines = actionLines.slice(0, maxActionLines);
  doc.text(displayActionLines, position.x + 2, textY);
  textY += displayActionLines.length * 3.5;

  // Camera info
  if (opts.includeCameraInfo && beat.camera) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_SIZES.caption);
    doc.setTextColor('#666666');
    const cameraText = `📷 ${beat.camera} | 💡 ${beat.lighting}`;
    doc.text(cameraText, position.x + 2, textY);
    textY += 3.5;
  }

  // Dialogue
  if (opts.includeDialogue && beat.dialogue) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(FONT_SIZES.caption);
    doc.setTextColor('#333333');
    const dialogueLines = doc.splitTextToSize(`"${beat.dialogue}"`, maxTextWidth);
    const maxDialogueLines = 2;
    doc.text(dialogueLines.slice(0, maxDialogueLines), position.x + 2, textY);
    textY += Math.min(dialogueLines.length, maxDialogueLines) * 3;
  }

  // Characters/Products
  if (beat.characters?.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_SIZES.caption);
    doc.setTextColor(COLORS.accent);
    doc.text(beat.characters.join(' • '), position.x + 2, textY);
  }

  // Status badge
  const statusColors: Record<string, string> = {
    'Draft': '#a0aec0',
    'In Review': '#4299e1',
    'Changes Requested': '#ed8936',
    'Approved': '#48bb78',
  };
  const statusColor = statusColors[beat.status] || '#a0aec0';

  doc.setFillColor(statusColor);
  doc.roundedRect(
    position.x + position.width - 22,
    position.y + position.height - 6,
    20,
    5,
    1,
    1,
    'F'
  );
  doc.setTextColor(COLORS.white);
  doc.setFontSize(6);
  doc.text(beat.status, position.x + position.width - 12, position.y + position.height - 3, { align: 'center' });
};

// ============================================
// EXPORT CSV SHOT LIST
// ============================================

export const exportShotListCSV = (project: Project): string => {
  if (!project.structure) {
    throw new Error('No structure to export');
  }

  const isProduct = project.type === 'product';
  const headers = isProduct
    ? 'Collection,Shoot,Shot ID,Products,Composition,Caption,Camera,Lighting,Environment,Status'
    : 'Act,Scene,Shot ID,Characters,Action,Dialogue,Camera,Lighting,Location,Status';

  const rows: string[] = [];

  project.structure.acts.forEach(act => {
    act.scenes.forEach(scene => {
      scene.beats.forEach(beat => {
        const row = [
          isProduct ? `Collection ${act.act_number}` : `Act ${act.act_number}`,
          isProduct ? scene.summary : `Scene ${scene.scene_number}`,
          beat.beat_id,
          `"${beat.characters.join(', ')}"`,
          `"${beat.action.replace(/"/g, '""')}"`,
          `"${(beat.dialogue || '').replace(/"/g, '""')}"`,
          beat.camera,
          beat.lighting,
          `"${beat.location}"`,
          beat.status,
        ].join(',');
        rows.push(row);
      });
    });
  });

  return headers + '\n' + rows.join('\n');
};

// ============================================
// DOWNLOAD HELPERS
// ============================================

export const downloadPDF = async (project: Project, options?: PDFExportOptions) => {
  const blob = await exportStoryboardPDF(project, options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name}_Storyboard.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadCSV = (project: Project) => {
  const csv = exportShotListCSV(project);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name}_ShotList.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
