import { RawNodeDatum } from "react-d3-tree";

interface PdfBlock {
  personName: string;
  dob: string;
  spouseName: string;
  spouseDob: string;
  children: { name: string; dob: string }[];
  generation: number;
}

function collectBlocks(node: RawNodeDatum, out: PdfBlock[], generation: number = 1) {
  const a = node.attributes ?? {};
  out.push({
    personName: (a.personName as string) || node.name,
    dob: (a.dob as string) || "",
    spouseName: (a.spouseName as string) || "",
    spouseDob: (a.spouseDob as string) || "",
    children: (node.children ?? []).map((c) => ({
      name: (c.attributes?.personName as string) || c.name,
      dob: (c.attributes?.dob as string) || "",
    })),
    generation,
  });
  (node.children ?? []).forEach((c) => collectBlocks(c, out, generation + 1));
}

export async function exportTreePdf(treeName: string, treeData: RawNodeDatum) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const blocks: PdfBlock[] = [];

  // Skip synthetic "Family" root (no attributes) — process its children instead
  if (treeData.attributes) {
    collectBlocks(treeData, blocks);
  } else {
    (treeData.children ?? []).forEach((c) => collectBlocks(c, blocks));
  }

  const fmt = (name: string, dob: string) => (dob ? `${name} (${dob})` : name);

  const checkPageBreak = (needed: number) => {
    if (y + needed > 280) { doc.addPage(); y = 20; }
  };

  let y = 20;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(treeName, 14, y);
  y += 12;

  let currentGen = 0;

  for (const block of blocks.filter((b) => b.spouseName || b.children.length > 0)) {
    // Generation header when generation changes
    if (block.generation !== currentGen) {
      currentGen = block.generation;
      checkPageBreak(18);
      y += 4;
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text(`Generation ${currentGen}`, 14, y);
      y += 5;
      doc.setDrawColor(180, 180, 180);
      doc.line(14, y, 196, y);
      y += 8;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
    }

    checkPageBreak(22);

    // Section heading: "John Smith's Family"
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(`${block.personName}'s Family`, 14, y);
    y += 6;
    doc.setTextColor(0, 0, 0);

    // Parents line
    const parents = block.spouseName
      ? `${fmt(block.personName, block.dob)} & ${fmt(block.spouseName, block.spouseDob)}`
      : fmt(block.personName, block.dob);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(parents, 14, y);
    y += 7;

    // Children line
    if (block.children.length > 0) {
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(
        `Children: ${block.children.map((c) => fmt(c.name, c.dob)).join(", ")}`,
        180
      );
      checkPageBreak(lines.length * 6);
      doc.text(lines, 14, y);
      y += lines.length * 6;
    }

    y += 8;
  }

  doc.save(`${treeName}.pdf`);
}
