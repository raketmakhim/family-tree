import { useState, FormEvent } from "react";
import { api } from "../api/client";
import { Person, Relationship } from "../types";
import PersonSearch from "./PersonSearch";

interface Props {
  treeId: string;
  person?: Person; // if provided, editing; otherwise creating
  people?: Person[]; // full tree people list, for adding relationships in edit mode
  relationships?: Relationship[]; // existing relationships for this person (edit mode)
  onRemoveRelationship?: (rel: Relationship) => void;
  onSaved: () => void;
  onCancel: () => void;
}

interface Row { name: string; dob: string; }
interface RelRow { toPersonId: string; type: "PARENT" | "SIBLING" | "SPOUSE"; }

const defaultRelRow = (): RelRow => ({ toPersonId: "", type: "PARENT" });

export default function PersonForm({ treeId, person, people = [], relationships = [], onRemoveRelationship, onSaved, onCancel }: Props) {
  // Edit mode: single fields
  const [name, setName] = useState(person?.name ?? "");
  const [dob, setDob] = useState(person?.dob ?? "");
  const [marriedIn, setMarriedIn] = useState(person?.marriedIn ?? false);

  // Edit mode: add relationships
  const [relRows, setRelRows] = useState<RelRow[]>([defaultRelRow()]);
  const updateRelRow = <K extends keyof RelRow>(i: number, field: K, val: RelRow[K]) =>
    setRelRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  const addRelRow = () => setRelRows((prev) => [...prev, defaultRelRow()]);
  const removeRelRow = (i: number) => setRelRows((prev) => prev.filter((_, idx) => idx !== i));

  // Create mode: multiple rows
  const [rows, setRows] = useState<Row[]>([{ name: "", dob: "" }]);
  const updateRow = (i: number, field: keyof Row, val: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  const addRow = () => setRows((prev) => [...prev, { name: "", dob: "" }]);
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (person) {
        await api.updatePerson(person.personId, {
          name: name || undefined,
          dob: dob || undefined,
          marriedIn,
        });
        // Add any filled relationship rows
        for (const row of relRows) {
          if (!row.toPersonId) continue;
          await api.addRelationship(person.personId, row.toPersonId, row.type);
        }
      } else {
        for (const row of rows) {
          const created = await api.createPerson({
            name: row.name || undefined,
            dob: row.dob || undefined,
          });
          await api.addMember(treeId, created.personId);
        }
      }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const others = people.filter((p) => p.personId !== person?.personId);

  if (person) {
    // Edit mode — single form + optional relationship rows
    return (
      <form onSubmit={handleSubmit}>
        <h3>Edit person</h3>
        <div className="field">
          <label>Name (optional)</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoFocus />
        </div>
        <div className="field">
          <label>Date of birth (optional)</label>
          <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        </div>
        <div className="field">
          <label className="checkbox-label">
            <input type="checkbox" checked={marriedIn} onChange={(e) => setMarriedIn(e.target.checked)} />
            Married into the family
          </label>
        </div>

        {others.length > 0 && (
          <>
            <p style={{ fontSize: 13, fontWeight: 500, color: "#475569", margin: "16px 0 8px" }}>Add relationships</p>
            <div className="bulk-rows">
              {relRows.map((row, i) => (
                <div key={i} className="bulk-row rel-row">
                  <div className="rel-row-pickers">
                    <input
                      type="text"
                      value={name || person.name || "This person"}
                      disabled
                      style={{ flex: 1, background: "#f1f5f9", color: "#64748b" }}
                    />
                    <select
                      value={row.type}
                      onChange={(e) => updateRelRow(i, "type", e.target.value as RelRow["type"])}
                      style={{ width: "auto", flexShrink: 0 }}
                    >
                      <option value="PARENT">Parent of</option>
                      <option value="SIBLING">Sibling of</option>
                      <option value="SPOUSE">Spouse of</option>
                    </select>
                    <PersonSearch
                      people={others}
                      value={row.toPersonId}
                      onChange={(id) => updateRelRow(i, "toPersonId", id)}
                      placeholder="Search person..."
                    />
                  </div>
                  {relRows.length > 1 && (
                    <button type="button" className="btn-danger-sm" onClick={() => removeRelRow(i)}>✕</button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" className="btn-secondary" style={{ marginBottom: 14 }} onClick={addRelRow}>
              + Add another
            </button>
          </>
        )}

        {relationships.length > 0 && (
          <>
            <p style={{ fontSize: 13, fontWeight: 500, color: "#475569", margin: "16px 0 8px" }}>Relationships</p>
            <ul className="rel-list" style={{ marginBottom: 4 }}>
              {relationships.map((r, i) => {
                const otherId = r.fromPersonId === person.personId ? r.toPersonId : r.fromPersonId;
                const other = people.find((p) => p.personId === otherId);
                const otherName = other?.name || "Unknown";
                let label: string;
                if (r.type === "SPOUSE") label = `Spouse of ${otherName}`;
                else if (r.type === "SIBLING") label = `Sibling of ${otherName}`;
                else label = r.fromPersonId === person.personId ? `Parent of ${otherName}` : `Child of ${otherName}`;
                return (
                  <li key={i}>
                    <span>{label}</span>
                    {onRemoveRelationship && (
                      <button type="button" className="btn-danger-sm" onClick={() => onRemoveRelationship(r)}>✕</button>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}

        

        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          <button type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</button>
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    );
  }

  // Create mode — multi-row
  return (
    <form onSubmit={handleSubmit}>
      <h3>Create {rows.length > 1 ? `${rows.length} people` : "person"}</h3>
      <div className="bulk-rows">
        {rows.map((row, i) => (
          <div key={i} className="bulk-row">
            <input
              type="text"
              value={row.name}
              onChange={(e) => updateRow(i, "name", e.target.value)}
              placeholder="Full name"
              autoFocus={i === 0}
            />
            <input
              type="date"
              value={row.dob}
              onChange={(e) => updateRow(i, "dob", e.target.value)}
            />
            {rows.length > 1 && (
              <button type="button" className="btn-danger-sm" onClick={() => removeRow(i)}>✕</button>
            )}
          </div>
        ))}
      </div>
      <button type="button" className="btn-secondary" style={{ marginBottom: 14 }} onClick={addRow}>
        + Add another
      </button>
      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : rows.length > 1 ? `Create ${rows.length} people` : "Create"}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
