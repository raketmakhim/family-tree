import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Tree } from "../types";

export default function TreesPage() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newTreeName, setNewTreeName] = useState("");
  const [creating, setCreating] = useState(false);
  const { isEditor, logout } = useAuth();
  const navigate = useNavigate();

  const loadTrees = async () => {
    try {
      setTrees(await api.getTrees());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load trees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTrees(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const tree = await api.createTree(newTreeName || undefined);
      setNewTreeName("");
      navigate(`/trees/${tree.treeId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create tree");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (treeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this tree?")) return;
    try {
      await api.deleteTree(treeId);
      setTrees((prev) => prev.filter((t) => t.treeId !== treeId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete tree");
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Family Trees</h1>
        <button className="btn-secondary" onClick={logout}>Sign out</button>
      </header>

      {error && <p className="error">{error}</p>}

      {isEditor && (
        <form className="inline-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="New tree name (optional)"
            value={newTreeName}
            onChange={(e) => setNewTreeName(e.target.value)}
          />
          <button type="submit" disabled={creating}>
            {creating ? "Creating..." : "New Tree"}
          </button>
        </form>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : trees.length === 0 ? (
        <p className="muted">No trees yet{isEditor ? " — create one above" : ""}.</p>
      ) : (
        <ul className="tree-list">
          {trees.map((tree) => (
            <li key={tree.treeId} className="tree-card" onClick={() => navigate(`/trees/${tree.treeId}`)}>
              <span>{tree.name || <em>Unnamed tree</em>}</span>
              {isEditor && (
                <button className="btn-danger-sm" onClick={(e) => handleDelete(tree.treeId, e)}>
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
