import { Person, Relationship } from "../types";
import PersonForm from "./PersonForm";
import RelationshipForm from "./RelationshipForm";

export type Modal = "addPerson" | "addRelationship" | "addMember" | "addChild" | "addSpouse" | "addParent" | null;

interface Props {
  modal: Modal;
  onClose: () => void;
  selectedPerson: Person | null;
  treeId: string;
  people: Person[];
  relationships: Relationship[];
  allPeople: Person[];
  quickName: string;
  onQuickName: (v: string) => void;
  quickDob: string;
  onQuickDob: (v: string) => void;
  quickLoading: boolean;
  quickError: string;
  onPersonSaved: () => void;
  onRelationshipSaved: () => void;
  onRemoveRelationship: (rel: Relationship) => void;
  onQuickAdd: (modalType: "addChild" | "addSpouse" | "addParent") => void;
  onAddMember: (personId: string) => void;
}

export default function TreeModals({
  modal, onClose,
  selectedPerson, treeId,
  people, relationships, allPeople,
  quickName, onQuickName, quickDob, onQuickDob,
  quickLoading, quickError,
  onPersonSaved, onRelationshipSaved, onRemoveRelationship,
  onQuickAdd, onAddMember,
}: Props) {
  if (!modal) return null;

  const overlay = (children: React.ReactNode) => (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );

  if (modal === "addPerson") return overlay(
    <PersonForm
      treeId={treeId}
      person={selectedPerson ?? undefined}
      people={people}
      relationships={selectedPerson ? relationships.filter(
        (r) => r.fromPersonId === selectedPerson.personId || r.toPersonId === selectedPerson.personId
      ) : []}
      onRemoveRelationship={onRemoveRelationship}
      onSaved={onPersonSaved}
      onCancel={onClose}
    />
  );

  if (modal === "addRelationship") return overlay(
    <RelationshipForm
      people={people}
      onSaved={onRelationshipSaved}
      onCancel={onClose}
    />
  );

  if ((modal === "addChild" || modal === "addSpouse" || modal === "addParent") && selectedPerson) return overlay(
    <>
      <h3>{modal === "addChild" ? "Add child" : modal === "addParent" ? "Add parent" : "Add spouse"} for {selectedPerson.name || "Unknown"}</h3>
      <form onSubmit={(e) => { e.preventDefault(); onQuickAdd(modal); }}>
        <div className="field">
          <label>Name (optional)</label>
          <input type="text" value={quickName} onChange={(e) => onQuickName(e.target.value)} placeholder="Full name" autoFocus />
        </div>
        <div className="field">
          <label>Date of birth (optional)</label>
          <input type="date" value={quickDob} onChange={(e) => onQuickDob(e.target.value)} />
        </div>
        {quickError && <p className="error">{quickError}</p>}
        <div className="form-actions">
          <button type="submit" disabled={quickLoading}>{quickLoading ? "Saving..." : "Create"}</button>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </>
  );

  if (modal === "addMember") {
    const available = allPeople.filter((p) => !people.find((m) => m.personId === p.personId));
    return overlay(
      <>
        <h3>Add existing person</h3>
        {available.length === 0 ? (
          <p className="muted">All people are already in this tree.</p>
        ) : (
          <ul className="person-select-list">
            {available.map((p) => (
              <li key={p.personId} onClick={() => onAddMember(p.personId)}>
                {p.name || "Unknown"} {p.dob ? `(${p.dob})` : ""}
              </li>
            ))}
          </ul>
        )}
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
      </>
    );
  }

  return null;
}
