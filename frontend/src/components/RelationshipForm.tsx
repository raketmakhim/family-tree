import { useState, FormEvent } from "react";
import { api } from "../api/client";
import { Person } from "../types";
import PersonSearch from "./PersonSearch";

interface Props {
  people: Person[];
  onSaved: () => void;
  onCancel: () => void;
}

interface Row {
  fromPersonId: string;
  toPersonId: string;
  type: "PARENT" | "SIBLING" | "SPOUSE";
}

const defaultRow = (): Row => ({ fromPersonId: "", toPersonId: "", type: "PARENT" });

export default function RelationshipForm({ people, onSaved, onCancel }: Props) {
  const [rows, setRows] = useState<Row[]>([defaultRow()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateRow = <K extends keyof Row>(i: number, field: K, val: Row[K]) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));

  const addRow = () => setRows((prev) => [...prev, defaultRow()]);
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    for (const row of rows) {
      if (!row.fromPersonId || !row.toPersonId) return setError("Select both people for each row");
      if (row.fromPersonId === row.toPersonId) return setError("Cannot relate a person to themselves");
    }
    setLoading(true);
    setError("");
    try {
      for (const row of rows) {
        await api.addRelationship(row.fromPersonId, row.toPersonId, row.type);
      }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add relationship");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Add {rows.length > 1 ? `${rows.length} relationships` : "relationship"}</h3>

      <div className="bulk-rows">
        {rows.map((row, i) => (
          <div key={i} className="bulk-row rel-row">
            <div className="rel-row-pickers">
              <PersonSearch
                people={people}
                value={row.fromPersonId}
                onChange={(id) => updateRow(i, "fromPersonId", id)}
                exclude={row.toPersonId}
                placeholder={row.type === "PARENT" ? "Parent..." : "Person A..."}
              />
              <select
                value={row.type}
                onChange={(e) => updateRow(i, "type", e.target.value as Row["type"])}
                style={{ width: "auto", flexShrink: 0 }}
              >
                <option value="PARENT">Parent of</option>
                <option value="SIBLING">Sibling of</option>
                <option value="SPOUSE">Spouse of</option>
              </select>
              <PersonSearch
                people={people}
                value={row.toPersonId}
                onChange={(id) => updateRow(i, "toPersonId", id)}
                exclude={row.fromPersonId}
                placeholder={row.type === "PARENT" ? "Child..." : "Person B..."}
              />
            </div>
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
          {loading ? "Adding..." : rows.length > 1 ? `Add ${rows.length} relationships` : "Add"}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
