import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Tree from "react-d3-tree";
import { CustomNodeElementProps } from "react-d3-tree";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Person, TreeData } from "../types";
import PersonForm from "../components/PersonForm";
import RelationshipForm from "../components/RelationshipForm";
import TreeNode from "../components/TreeNode";
import { buildTreeData, stubPath } from "../utils/buildTreeData";
import { exportTreePdf } from "../utils/pdfExport";

type Modal = "addPerson" | "addRelationship" | "addMember" | "addChild" | "addSpouse" | null;

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
  const [quickName, setQuickName] = useState("");
  const [quickDob, setQuickDob] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState("");
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

  const handleRemoveRelationship = async (rel: { fromPersonId: string; toPersonId: string; type: "PARENT" | "SIBLING" | "SPOUSE" }) => {
    await api.removeRelationship(rel.fromPersonId, rel.toPersonId, rel.type);
    load();
  };

  const openQuickAdd = (type: "addChild" | "addSpouse") => {
    setQuickName("");
    setQuickDob("");
    setQuickError("");
    setModal(type);
  };

  const handleQuickAdd = async (relType: "PARENT" | "SPOUSE") => {
    if (!treeId || !selectedPerson) return;
    setQuickLoading(true);
    setQuickError("");
    try {
      const created = await api.createPerson({ name: quickName || undefined, dob: quickDob || undefined });
      await api.addMember(treeId, created.personId);
      await api.addRelationship(selectedPerson.personId, created.personId, relType);
      setModal(null);
      load();
    } catch (err: unknown) {
      setQuickError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setQuickLoading(false);
    }
  };

  // Auto-backup: fires silently on first visit of each calendar day
  useEffect(() => {
    if (!data || !treeId) return;
    const today = new Date().toISOString().slice(0, 10);
    if (data.tree.lastBackupDate === today) return;
    api.backupTree(treeId).then(({ lastBackupDate }) => {
      setData((prev) => prev ? { ...prev, tree: { ...prev.tree, lastBackupDate } } : prev);
    }).catch(() => {}); // silent — backup failure shouldn't block the UI
  }, [data?.tree.treeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownloadJson = () => {
    const payload = JSON.stringify(
      { exportedAt: new Date().toISOString(), tree: data!.tree, people: data!.people, relationships: data!.relationships },
      null, 2
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data!.tree.name || "family-tree"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !treeId) return;
    const text = await file.text();
    const payload = JSON.parse(text);
    if (!confirm("This will overwrite the current tree with the backup. Are you sure?")) return;
    await api.restoreTree(treeId, payload);
    load();
  };

  const selectById = useCallback((personId: string) => {
    if (!data) return;
    setSelectedPerson(data.people.find((p) => p.personId === personId) ?? null);
  }, [data]);

  if (loading) return <div className="page"><p>Loading...</p></div>;
  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!data) return null;

  const connectedIds = new Set([
    ...data.relationships.map((r) => r.fromPersonId),
    ...data.relationships.map((r) => r.toPersonId),
  ]);
  const connectedPeople = data.people.filter((p) => connectedIds.has(p.personId));
  const unconnectedPeople = data.people.filter((p) => !connectedIds.has(p.personId));

  const treeData = buildTreeData(connectedPeople, data.relationships);
  const treeName = data.tree.name || "Family Tree";

  const renderNode = ({ nodeDatum }: CustomNodeElementProps) => (
    <TreeNode
      nodeDatum={nodeDatum}
      selectedPersonId={selectedPerson?.personId}
      onSelect={selectById}
    />
  );

  return (
    <div className="tree-page">
      {/* Header */}
      <header className="page-header">
        <button className="btn-secondary" onClick={() => navigate("/trees")}>← Trees</button>
        <h1>{treeName}</h1>
        <span />
      </header>

      <div className="tree-layout">
        {/* Tree canvas */}
        <div className="tree-canvas" ref={containerRef}>
          {connectedPeople.length === 0 ? (
            <p className="muted centered">No people in this tree yet.</p>
          ) : (
            <Tree
              data={treeData}
              orientation="vertical"
              translate={translate}
              nodeSize={{ x: 200, y: 160 }}
              separation={{ siblings: 1.1, nonSiblings: 1.6 }}
              renderCustomNodeElement={renderNode}
              pathFunc={stubPath as any}
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
                  <button onClick={() => openQuickAdd("addChild")}>+ Add child</button>
                  <button onClick={() => openQuickAdd("addSpouse")}>+ Add spouse</button>
                  <button className="btn-danger" onClick={handleRemoveMember}>
                    Remove from tree
                  </button>
                </div>
              )}
            </div>
          )}

          {unconnectedPeople.length > 0 && (
            <div className="editor-actions">
              <h4>No relationships</h4>
              <ul className="person-select-list">
                {unconnectedPeople.map((p) => (
                  <li key={p.personId} onClick={() => setSelectedPerson(p)}>
                    {p.name || "Unknown"}{p.dob ? ` (${p.dob})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="editor-actions">
            <h4>Export</h4>
            <div className="button-stack">
              <button className="btn-secondary" onClick={() => exportTreePdf(treeName, treeData)}>
                Download PDF
              </button>
              <button className="btn-secondary" onClick={handleDownloadJson}>
                Download JSON
              </button>
            </div>
            {data.tree.lastBackupDate && (
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                Last backed up: {data.tree.lastBackupDate}
              </p>
            )}
          </div>

          {isEditor && (
            <div className="editor-actions">
              <h4>Restore</h4>
              <div className="button-stack">
                <label className="btn-secondary" style={{ cursor: "pointer" }}>
                  Upload backup JSON
                  <input type="file" accept=".json" style={{ display: "none" }} onChange={handleRestore} />
                </label>
              </div>
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
              people={data.people}
              relationships={selectedPerson ? data.relationships.filter(
                (r) => r.fromPersonId === selectedPerson.personId || r.toPersonId === selectedPerson.personId
              ) : []}
              onRemoveRelationship={handleRemoveRelationship}
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

      {(modal === "addChild" || modal === "addSpouse") && selectedPerson && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{modal === "addChild" ? "Add child" : "Add spouse"} for {selectedPerson.name || "Unknown"}</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleQuickAdd(modal === "addChild" ? "PARENT" : "SPOUSE"); }}>
              <div className="field">
                <label>Name (optional)</label>
                <input type="text" value={quickName} onChange={(e) => setQuickName(e.target.value)} placeholder="Full name" autoFocus />
              </div>
              <div className="field">
                <label>Date of birth (optional)</label>
                <input type="date" value={quickDob} onChange={(e) => setQuickDob(e.target.value)} />
              </div>
              {quickError && <p className="error">{quickError}</p>}
              <div className="form-actions">
                <button type="submit" disabled={quickLoading}>{quickLoading ? "Saving..." : "Create"}</button>
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              </div>
            </form>
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
