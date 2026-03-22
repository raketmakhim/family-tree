import { useState, FormEvent } from "react";
import { api } from "../api/client";
import { Person } from "../types";

interface Props {
  treeId: string;
  person?: Person; // if provided, editing; otherwise creating
  onSaved: () => void;
  onCancel: () => void;
}

interface Row { name: string; dob: string; }

export default function PersonForm({ treeId, person, onSaved, onCancel }: Props) {
  // Edit mode: single fields
  const [name, setName] = useState(person?.name ?? "");
  const [dob, setDob] = useState(person?.dob ?? "");
  const [marriedIn, setMarriedIn] = useState(person?.marriedIn ?? false);

  // Create mode: multiple rows
  const [rows, setRows] = useState<Row[]>([{ name: "", dob: "" }]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateRow = (i: number, field: keyof Row, val: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));

  const addRow = () => setRows((prev) => [...prev, { name: "", dob: "" }]);
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

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

  if (person) {
    // Edit mode — single form
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
