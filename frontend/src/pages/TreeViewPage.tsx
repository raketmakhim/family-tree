import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Tree from "react-d3-tree";
import { CustomNodeElementProps } from "react-d3-tree";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Person, Relationship, TreeData } from "../types";
import TreeNode from "../components/TreeNode";
import TreeSidePanel from "../components/TreeSidePanel";
import TreeModals, { Modal } from "../components/TreeModals";
import { buildTreeData, stubPath } from "../utils/buildTreeData";
import { exportTreePdf } from "../utils/pdfExport";

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
  const [siblingSpacing, setSiblingSpacing] = useState(0.5);
  const [familySpacing, setFamilySpacing] = useState(1);
  const [spouseGap, setSpouseGap] = useState(24);
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

  // Auto-backup: fires silently on first visit of each calendar day
  useEffect(() => {
    if (!data || !treeId) return;
    const today = new Date().toISOString().slice(0, 10);
    if (data.tree.lastBackupDate === today) return;
    api.backupTree(treeId).then(({ lastBackupDate }) => {
      setData((prev) => prev ? { ...prev, tree: { ...prev.tree, lastBackupDate } } : prev);
    }).catch(() => {});
  }, [data?.tree.treeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectById = useCallback((personId: string) => {
    if (!data) return;
    setSelectedPerson(data.people.find((p) => p.personId === personId) ?? null);
  }, [data]);

  const editById = useCallback((personId: string) => {
    if (!data) return;
    setSelectedPerson(data.people.find((p) => p.personId === personId) ?? null);
    setModal("addPerson");
  }, [data]);

  // D3 zoom calls stopImmediatePropagation() on dblclick, so React's onDoubleClick never fires.
  // Fix: intercept dblclick in capture phase (before D3's bubble-phase handler) and call editById directly.
  const editByIdRef = useRef(editById);
  useEffect(() => { editByIdRef.current = editById; }, [editById]);
  useEffect(() => {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;
    const onDblClick = (e: MouseEvent) => {
      const nodeEl = (e.target as Element).closest("[data-person-id]");
      if (!nodeEl) return;
      const personId = nodeEl.getAttribute("data-person-id");
      if (!personId) return;
      e.stopPropagation();
      editByIdRef.current(personId);
    };
    svg.addEventListener("dblclick", onDblClick, true);

    // Long-press to edit (mobile) — cancel if pointer moves more than 10px
    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    let startX = 0, startY = 0;

    const onPointerDown = (e: PointerEvent) => {
      const nodeEl = (e.target as Element).closest("[data-person-id]");
      if (!nodeEl) return;
      const personId = nodeEl.getAttribute("data-person-id");
      if (!personId) return;
      startX = e.clientX; startY = e.clientY;
      pressTimer = setTimeout(() => {
        pressTimer = null;
        editByIdRef.current(personId);
      }, 500);
    };
    const cancelPress = () => {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10) cancelPress();
    };
    // Prevent browser context menu appearing after long-press fires the modal
    const onContextMenu = (e: Event) => { if (!pressTimer) e.preventDefault(); };

    svg.addEventListener("pointerdown", onPointerDown);
    svg.addEventListener("pointerup", cancelPress);
    svg.addEventListener("pointermove", onPointerMove);
    svg.addEventListener("pointercancel", cancelPress);
    svg.addEventListener("contextmenu", onContextMenu);

    return () => {
      svg.removeEventListener("dblclick", onDblClick, true);
      svg.removeEventListener("pointerdown", onPointerDown);
      svg.removeEventListener("pointerup", cancelPress);
      svg.removeEventListener("pointermove", onPointerMove);
      svg.removeEventListener("pointercancel", cancelPress);
      svg.removeEventListener("contextmenu", onContextMenu);
      if (pressTimer) clearTimeout(pressTimer);
    };
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

  const handleRemoveRelationship = async (rel: Relationship) => {
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
      spouseGap={spouseGap}
    />
  );

  return (
    <div className="tree-page">
      <header className="page-header">
        <button className="btn-secondary" onClick={() => navigate("/trees")}>← Trees</button>
        <h1>{treeName}</h1>
        <span />
      </header>

      <div className="tree-layout">
        <div className="tree-canvas" ref={containerRef} onClick={() => setSelectedPerson(null)}>
          {connectedPeople.length === 0 ? (
            <p className="muted centered">No people in this tree yet.</p>
          ) : (
            <Tree
              data={treeData}
              orientation="vertical"
              translate={translate}
              nodeSize={{ x: 200, y: 160 }}
              separation={{ siblings: siblingSpacing, nonSiblings: familySpacing }}
              renderCustomNodeElement={renderNode}
              pathFunc={stubPath as any}
            />
          )}
        </div>

        <TreeSidePanel
          selectedPerson={selectedPerson}
          unconnectedPeople={unconnectedPeople}
          isEditor={isEditor}
          siblingSpacing={siblingSpacing} onSiblingSpacing={setSiblingSpacing}
          familySpacing={familySpacing} onFamilySpacing={setFamilySpacing}
          spouseGap={spouseGap} onSpouseGap={setSpouseGap}
          lastBackupDate={data.tree.lastBackupDate}
          onEditPerson={() => setModal("addPerson")}
          onAddChild={() => openQuickAdd("addChild")}
          onAddSpouse={() => openQuickAdd("addSpouse")}
          onRemoveMember={handleRemoveMember}
          onSelectPerson={setSelectedPerson}
          onExportPdf={() => exportTreePdf(treeName, treeData)}
          onDownloadJson={handleDownloadJson}
          onRestore={handleRestore}
          onCreatePerson={() => { setSelectedPerson(null); setModal("addPerson"); }}
          onOpenAddMember={openAddMember}
          onAddRelationship={() => setModal("addRelationship")}
        />
      </div>

      <TreeModals
        modal={modal}
        onClose={() => setModal(null)}
        selectedPerson={selectedPerson}
        treeId={treeId!}
        people={data.people}
        relationships={data.relationships}
        allPeople={allPeople}
        quickName={quickName} onQuickName={setQuickName}
        quickDob={quickDob} onQuickDob={setQuickDob}
        quickLoading={quickLoading}
        quickError={quickError}
        onPersonSaved={() => { setModal(null); setSelectedPerson(null); load(); }}
        onRelationshipSaved={() => { setModal(null); load(); }}
        onRemoveRelationship={handleRemoveRelationship}
        onQuickAdd={handleQuickAdd}
        onAddMember={handleAddMember}
      />
    </div>
  );
}
