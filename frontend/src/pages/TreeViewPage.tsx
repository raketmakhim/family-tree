import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Tree from "react-d3-tree";
import { RawNodeDatum, CustomNodeElementProps } from "react-d3-tree";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Person, Relationship, TreeData } from "../types";
import PersonForm from "../components/PersonForm";
import RelationshipForm from "../components/RelationshipForm";

// Convert flat people + relationships into react-d3-tree format.
// Rules:
//   - Couples (SPOUSE) are rendered as a single node showing both names.
//   - A spouse with no parents is absorbed into the couple node and removed as a root.
//   - A spouse who has parents appears in their own family subtree; their name is still
//     shown on the partner's node but they are NOT duplicated.
//   - Children shared by two parents only appear once (under the first parent processed).
//   - Siblings are sorted oldest → youngest (left → right) by DOB.
function buildTreeData(people: Person[], relationships: Relationship[]): RawNodeDatum {
  const parentRels = relationships.filter((r) => r.type === "PARENT");
  const spouseRels = relationships.filter((r) => r.type === "SPOUSE");
  const hasParent = new Set(parentRels.map((r) => r.toPersonId));

  // Global set — once placed in the tree a person won't appear again.
  const placed = new Set<string>();

  function sortByDob(arr: Person[]): Person[] {
    return arr.sort((a, b) => {
      if (!a.dob && !b.dob) return 0;
      if (!a.dob) return 1;
      if (!b.dob) return -1;
      return a.dob.localeCompare(b.dob);
    });
  }

  function buildNode(person: Person, ancestors: Set<string>): RawNodeDatum {
    placed.add(person.personId);
    const newAncestors = new Set(ancestors);
    newAncestors.add(person.personId);

    // Find a spouse without parents who hasn't been placed yet — absorb them.
    const absorbedSpouse = spouseRels
      .filter((r) => r.fromPersonId === person.personId && !hasParent.has(r.toPersonId) && !placed.has(r.toPersonId))
      .map((r) => people.find((p) => p.personId === r.toPersonId))
      .filter((p): p is Person => !!p)[0];

    // Find a spouse WITH parents — show name only, don't absorb.
    const linkedSpouse = !absorbedSpouse
      ? spouseRels
          .filter((r) => r.fromPersonId === person.personId && hasParent.has(r.toPersonId) && !placed.has(r.toPersonId))
          .map((r) => people.find((p) => p.personId === r.toPersonId))
          .filter((p): p is Person => !!p)[0]
      : undefined;

    const spouse = absorbedSpouse ?? linkedSpouse;
    if (absorbedSpouse) {
      placed.add(absorbedSpouse.personId);
      newAncestors.add(absorbedSpouse.personId);
    }

    // Collect children from both partners, deduplicated, excluding ancestors.
    const unitIds = [person.personId, ...(spouse ? [spouse.personId] : [])];
    const childIdSet = new Set<string>();
    for (const pid of unitIds) {
      parentRels
        .filter((r) => r.fromPersonId === pid && !placed.has(r.toPersonId) && !newAncestors.has(r.toPersonId))
        .forEach((r) => childIdSet.add(r.toPersonId));
    }

    const children = sortByDob(
      Array.from(childIdSet)
        .map((id) => people.find((p) => p.personId === id))
        .filter((p): p is Person => !!p)
    ).map((p) => buildNode(p, newAncestors));

    return {
      name: person.name || "Unknown",
      attributes: {
        personId: person.personId,
        personName: person.name || "Unknown",
        dob: person.dob ?? "",
        spouseId: spouse?.personId ?? "",
        spouseName: spouse ? (spouse.name || "Unknown") : "",
        spouseDob: spouse?.dob ?? "",
      },
      children: children.length > 0 ? children : undefined,
    };
  }

  if (people.length === 0) return { name: "Empty tree", children: [] };

  const roots = people.filter((p) => !hasParent.has(p.personId));
  const rootNodes: RawNodeDatum[] = [];
  for (const root of roots) {
    if (!placed.has(root.personId)) {
      rootNodes.push(buildNode(root, new Set()));
    }
  }

  if (rootNodes.length === 1) return rootNodes[0];
  return { name: "Family", children: rootNodes };
}

type Modal = "addPerson" | "addRelationship" | "addMember" | null;

export default function TreeViewPage() {
  const { treeId } = useParams<{ treeId: string }>();
  const navigate = useNavigate();
  const { isEditor } = useAuth();

  const [data, setData] = useState<TreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [allPeople, setAllPeople] = useState<Person[]>([]);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!treeId) return;
    try {
      const result = await api.getTree(treeId);
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load tree");
    } finally {
      setLoading(false);
    }
  }, [treeId]);

  useEffect(() => { load(); }, [load]);

  // Centre the tree in the container
  useEffect(() => {
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect();
      setTranslate({ x: width / 2, y: 80 });
    }
  }, [data]);

  const openAddMember = async () => {
    const people = await api.getPeople();
    setAllPeople(people);
    setModal("addMember");
  };

  const handleAddMember = async (personId: string) => {
    if (!treeId) return;
    await api.addMember(treeId, personId);
    setModal(null);
    load();
  };

  const handleRemoveMember = async () => {
    if (!treeId || !selectedPerson) return;
    if (!confirm(`Remove ${selectedPerson.name || "this person"} from the tree?`)) return;
    await api.removeMember(treeId, selectedPerson.personId);
    setSelectedPerson(null);
    load();
  };

  const handlePersonSaved = () => {
    setModal(null);
    setSelectedPerson(null);
    load();
  };

  const handleRelationshipSaved = () => {
    setModal(null);
    load();
  };

  const selectById = useCallback((personId: string) => {
    if (!data) return;
    setSelectedPerson(data.people.find((p) => p.personId === personId) ?? null);
  }, [data]);

  const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + "…" : s;

  const renderNode = ({ nodeDatum }: CustomNodeElementProps) => {
    const attrs = nodeDatum.attributes ?? {};
    const personId = attrs.personId as string | undefined;
    const spouseId = attrs.spouseId as string | undefined;
    const spouseName = attrs.spouseName as string | undefined;
    const spouseDob = attrs.spouseDob as string | undefined;
    const dob = attrs.dob as string | undefined;
    const isPersonSel = selectedPerson?.personId === personId;
    const isSpouseSel = selectedPerson?.personId === spouseId;

    if (spouseId) {
      // Couple node — two panels side by side with ♥ between
      const PW = 100; // panel width
      const PH = 32;  // panel half-height
      const gap = 10; // half-gap for heart
      return (
        <g>
          {/* Left panel — primary person */}
          <g onClick={() => personId && selectById(personId)} style={{ cursor: "pointer" }}>
            <rect x={-(PW + gap)} y={-PH} width={PW} height={PH * 2} rx={7}
              fill={isPersonSel ? "#4f46e5" : "#e0e7ff"} stroke="#4f46e5" strokeWidth={2} />
            <text textAnchor="middle" x={-(gap + PW / 2)} y={-6} fontSize={11}
              fill={isPersonSel ? "#fff" : "#1e1b4b"}>
              {trunc(nodeDatum.name, 12)}
            </text>
            {dob && (
              <text textAnchor="middle" x={-(gap + PW / 2)} y={10} fontSize={9}
                fill={isPersonSel ? "#c7d2fe" : "#6b7280"}>
                {dob}
              </text>
            )}
          </g>
          {/* Heart */}
          <text textAnchor="middle" x={0} y={5} fontSize={14} fill="#9333ea"
            style={{ pointerEvents: "none" }}>♥</text>
          {/* Right panel — spouse */}
          <g onClick={() => selectById(spouseId)} style={{ cursor: "pointer" }}>
            <rect x={gap} y={-PH} width={PW} height={PH * 2} rx={7}
              fill={isSpouseSel ? "#4f46e5" : "#e0e7ff"} stroke="#4f46e5" strokeWidth={2} />
            <text textAnchor="middle" x={gap + PW / 2} y={-6} fontSize={11}
              fill={isSpouseSel ? "#fff" : "#1e1b4b"}>
              {trunc(spouseName || "Unknown", 12)}
            </text>
            {spouseDob && (
              <text textAnchor="middle" x={gap + PW / 2} y={10} fontSize={9}
                fill={isSpouseSel ? "#c7d2fe" : "#6b7280"}>
                {spouseDob}
              </text>
            )}
          </g>
        </g>
      );
    }

    // Single person — circle
    return (
      <g onClick={() => personId && selectById(personId)} style={{ cursor: "pointer" }}>
        <circle r={32} fill={isPersonSel ? "#4f46e5" : "#e0e7ff"} stroke="#4f46e5" strokeWidth={2} />
        <text textAnchor="middle" y={-5} fontSize={11} fill={isPersonSel ? "#fff" : "#1e1b4b"}>
          {trunc(nodeDatum.name, 12)}
        </text>
        {dob && (
          <text textAnchor="middle" y={10} fontSize={9} fill={isPersonSel ? "#c7d2fe" : "#6b7280"}>
            {dob}
          </text>
        )}
      </g>
    );
  };

  if (loading) return <div className="page"><p>Loading...</p></div>;
  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!data) return null;

  const treeData = buildTreeData(data.people, data.relationships);

  return (
    <div className="tree-page">
      {/* Header */}
      <header className="page-header">
        <button className="btn-secondary" onClick={() => navigate("/trees")}>← Trees</button>
        <h1>{data.tree.name || "Unnamed Tree"}</h1>
        <span />
      </header>

      <div className="tree-layout">
        {/* Tree canvas */}
        <div className="tree-canvas" ref={containerRef}>
          {data.people.length === 0 ? (
            <p className="muted centered">No people in this tree yet.</p>
          ) : (
            <Tree
              data={treeData}
              orientation="vertical"
              translate={translate}
              nodeSize={{ x: 240, y: 140 }}
              separation={{ siblings: 1.5, nonSiblings: 2 }}
              renderCustomNodeElement={renderNode}
              pathFunc="step"
            />
          )}
        </div>

        {/* Side panel */}
        <aside className="side-panel">
          {selectedPerson && (
            <div className="person-card">
              <h3>{selectedPerson.name || "Unknown"}</h3>
              {selectedPerson.dob && <p>Born: {selectedPerson.dob}</p>}
              {isEditor && (
                <div className="button-stack">
                  <button onClick={() => setModal("addPerson")}>Edit person</button>
                  <button className="btn-danger" onClick={handleRemoveMember}>
                    Remove from tree
                  </button>
                </div>
              )}
            </div>
          )}

          {isEditor && (
            <div className="editor-actions">
              <h4>Editor actions</h4>
              <div className="button-stack">
                <button onClick={() => { setSelectedPerson(null); setModal("addPerson"); }}>
                  + Create person
                </button>
                <button onClick={openAddMember}>+ Add existing person</button>
                <button onClick={() => setModal("addRelationship")}>+ Add relationship</button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Modals */}
      {modal === "addPerson" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <PersonForm
              treeId={treeId!}
              person={modal === "addPerson" && selectedPerson ? selectedPerson : undefined}
              onSaved={handlePersonSaved}
              onCancel={() => setModal(null)}
            />
          </div>
        </div>
      )}

      {modal === "addRelationship" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <RelationshipForm
              people={data.people}
              onSaved={handleRelationshipSaved}
              onCancel={() => setModal(null)}
            />
          </div>
        </div>
      )}

      {modal === "addMember" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add existing person</h3>
            {allPeople.filter((p) => !data.people.find((m) => m.personId === p.personId)).length === 0 ? (
              <p className="muted">All people are already in this tree.</p>
            ) : (
              <ul className="person-select-list">
                {allPeople
                  .filter((p) => !data.people.find((m) => m.personId === p.personId))
                  .map((p) => (
                    <li key={p.personId} onClick={() => handleAddMember(p.personId)}>
                      {p.name || "Unknown"} {p.dob ? `(${p.dob})` : ""}
                    </li>
                  ))}
              </ul>
            )}
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
