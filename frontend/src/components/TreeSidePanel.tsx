import { Person } from "../types";

interface Props {
  selectedPerson: Person | null;
  unconnectedPeople: Person[];
  isEditor: boolean;
  siblingSpacing: number;
  onSiblingSpacing: (v: number) => void;
  familySpacing: number;
  onFamilySpacing: (v: number) => void;
  spouseGap: number;
  onSpouseGap: (v: number) => void;
  lastBackupDate?: string;
  onEditPerson: () => void;
  onAddChild: () => void;
  onAddParent: () => void;
  onAddSpouse: () => void;
  onRemoveMember: () => void;
  onSelectPerson: (p: Person) => void;
  onExportPdf: () => void;
  onDownloadJson: () => void;
  onRestore: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCreatePerson: () => void;
  onOpenAddMember: () => void;
  onAddRelationship: () => void;
}

export default function TreeSidePanel({
  selectedPerson,
  unconnectedPeople,
  isEditor,
  siblingSpacing, onSiblingSpacing,
  familySpacing, onFamilySpacing,
  spouseGap, onSpouseGap,
  lastBackupDate,
  onEditPerson, onAddChild, onAddParent, onAddSpouse, onRemoveMember,
  onSelectPerson,
  onExportPdf, onDownloadJson, onRestore,
  onCreatePerson, onOpenAddMember, onAddRelationship,
}: Props) {
  return (
    <aside className="side-panel">
      {selectedPerson && (
        <div className="person-card">
          <h3>{selectedPerson.name || "Unknown"}</h3>
          {selectedPerson.dob && <p>Born: {selectedPerson.dob}</p>}
          {isEditor && (
            <div className="button-stack">
              <button onClick={onEditPerson}>Edit person</button>
              <button onClick={onAddChild}>+ Add child</button>
              <button onClick={onAddParent}>+ Add parent</button>
              <button onClick={onAddSpouse}>+ Add spouse</button>
              <button className="btn-danger" onClick={onRemoveMember}>
                Remove from tree
              </button>
            </div>
          )}
        </div>
      )}

      {unconnectedPeople.length > 0 && (
        <div className="editor-actions desktop-only">
          <h4>No relationships</h4>
          <ul className="person-select-list">
            {unconnectedPeople.map((p) => (
              <li key={p.personId} onClick={() => onSelectPerson(p)}>
                {p.name || "Unknown"}{p.dob ? ` (${p.dob})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="editor-actions desktop-only">
        <h4>Spacing</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 12, color: "#475569" }}>
            Siblings: {siblingSpacing.toFixed(1)}
            <input type="range" min={0.1} max={3} step={0.1} value={siblingSpacing}
              onChange={(e) => onSiblingSpacing(parseFloat(e.target.value))}
              style={{ width: "100%", marginTop: 2 }} />
          </label>
          <label style={{ fontSize: 12, color: "#475569" }}>
            Cross-family: {familySpacing.toFixed(1)}
            <input type="range" min={0.1} max={3} step={0.1} value={familySpacing}
              onChange={(e) => onFamilySpacing(parseFloat(e.target.value))}
              style={{ width: "100%", marginTop: 2 }} />
          </label>
          <label style={{ fontSize: 12, color: "#475569" }}>
            Spouse gap: {spouseGap}px
            <input type="range" min={0} max={120} step={4} value={spouseGap}
              onChange={(e) => onSpouseGap(parseInt(e.target.value))}
              style={{ width: "100%", marginTop: 2 }} />
          </label>
        </div>
      </div>

      <div className="editor-actions desktop-only">
        <h4>Export</h4>
        <div className="button-stack">
          <button className="btn-secondary" onClick={onExportPdf}>Download PDF</button>
          <button className="btn-secondary" onClick={onDownloadJson}>Download JSON</button>
        </div>
        {lastBackupDate && (
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Last backed up: {lastBackupDate}
          </p>
        )}
      </div>

      {isEditor && (
        <div className="editor-actions desktop-only">
          <h4>Restore</h4>
          <div className="button-stack">
            <label className="btn-secondary" style={{ cursor: "pointer" }}>
              Upload backup JSON
              <input type="file" accept=".json" style={{ display: "none" }} onChange={onRestore} />
            </label>
          </div>
        </div>
      )}

      {isEditor && (
        <div className="editor-actions">
          <h4>Editor actions</h4>
          <div className="button-stack">
            <button onClick={onCreatePerson}>+ Create person</button>
            <button onClick={onOpenAddMember}>+ Add existing person</button>
            <button onClick={onAddRelationship}>+ Add relationship</button>
          </div>
        </div>
      )}
    </aside>
  );
}
