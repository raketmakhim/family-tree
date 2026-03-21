import { useState, FormEvent } from "react";
import { api } from "../api/client";
import { Person } from "../types";

interface Props {
  treeId: string;
  person?: Person; // if provided, editing; otherwise creating
  onSaved: () => void;
  onCancel: () => void;
}

export default function PersonForm({ treeId, person, onSaved, onCancel }: Props) {
  const [name, setName] = useState(person?.name ?? "");
  const [dob, setDob] = useState(person?.dob ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (person) {
        // Edit existing
        await api.updatePerson(person.personId, {
          name: name || undefined,
          dob: dob || undefined,
        });
      } else {
        // Create new person and add to tree
        const created = await api.createPerson({
          name: name || undefined,
          dob: dob || undefined,
        });
        await api.addMember(treeId, created.personId);
      }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>{person ? "Edit person" : "Create person"}</h3>
      <div className="field">
        <label>Name (optional)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          autoFocus
        />
      </div>
      <div className="field">
        <label>Date of birth (optional)</label>
        <input
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
        />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : person ? "Save" : "Create"}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
