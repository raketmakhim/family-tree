import { useState, FormEvent } from "react";
import { api } from "../api/client";
import { Person } from "../types";

interface Props {
  people: Person[];
  onSaved: () => void;
  onCancel: () => void;
}

export default function RelationshipForm({ people, onSaved, onCancel }: Props) {
  const [fromPersonId, setFromPersonId] = useState("");
  const [toPersonId, setToPersonId] = useState("");
  const [type, setType] = useState<"PARENT" | "SIBLING" | "SPOUSE">("PARENT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fromPersonId || !toPersonId) return setError("Select both people");
    if (fromPersonId === toPersonId) return setError("Cannot relate a person to themselves");
    setLoading(true);
    setError("");
    try {
      await api.addRelationship(fromPersonId, toPersonId, type);
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add relationship");
    } finally {
      setLoading(false);
    }
  };

  const label = (p: Person) => p.name || "Unknown";

  return (
    <form onSubmit={handleSubmit}>
      <h3>Add relationship</h3>

      <div className="field">
        <label>Type</label>
        <div className="radio-group">
          <label>
            <input type="radio" value="PARENT" checked={type === "PARENT"} onChange={() => setType("PARENT")} />
            Parent
          </label>
          <label>
            <input type="radio" value="SIBLING" checked={type === "SIBLING"} onChange={() => setType("SIBLING")} />
            Sibling
          </label>
          <label>
            <input type="radio" value="SPOUSE" checked={type === "SPOUSE"} onChange={() => setType("SPOUSE")} />
            Spouse
          </label>
        </div>
      </div>

      <div className="field">
        <label>{type === "PARENT" ? "Parent" : "Person A"}</label>
        <select value={fromPersonId} onChange={(e) => setFromPersonId(e.target.value)} required>
          <option value="">Select person...</option>
          {people.map((p) => (
            <option key={p.personId} value={p.personId}>{label(p)}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>{type === "PARENT" ? "Child" : "Person B"}</label>
        <select value={toPersonId} onChange={(e) => setToPersonId(e.target.value)} required>
          <option value="">Select person...</option>
          {people.filter((p) => p.personId !== fromPersonId).map((p) => (
            <option key={p.personId} value={p.personId}>{label(p)}</option>
          ))}
        </select>
      </div>

      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <button type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add"}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
