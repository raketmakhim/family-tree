import { RawNodeDatum } from "react-d3-tree";

interface PdfBlock {
  personName: string;
  dob: string;
  spouseName: string;
  spouseDob: string;
  children: { name: string; dob: string }[];
}

function collectBlocks(node: RawNodeDatum, out: PdfBlock[]) {
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
  });
  (node.children ?? []).forEach((c) => collectBlocks(c, out));
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

  let y = 20;
  doc.setFontSize(16);
  doc.text(`Family Tree — ${treeName}`, 14, y);
  y += 12;
  doc.setFontSize(11);

  for (const block of blocks) {
    if (y > 270) { doc.addPage(); y = 20; }
    const header = block.spouseName
      ? `${fmt(block.personName, block.dob)} & ${fmt(block.spouseName, block.spouseDob)}`
      : fmt(block.personName, block.dob);
    doc.setFont("helvetica", "bold");
    doc.text(header, 14, y);
    y += 7;
    if (block.children.length > 0) {
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(
        `Children: ${block.children.map((c) => fmt(c.name, c.dob)).join(", ")}`,
        180
      );
      doc.text(lines, 14, y);
      y += lines.length * 6;
    }
    y += 6;
  }

  doc.save(`${treeName}.pdf`);
}
