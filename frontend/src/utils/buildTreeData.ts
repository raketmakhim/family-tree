import { RawNodeDatum } from "react-d3-tree";
import { Person, Relationship } from "../types";

// Custom path: short stubs up/down from the horizontal connector only.
// Avoids drawing full verticals that pass through the node area.
export const stubPath = ({
  source,
  target,
}: {
  source: { x: number; y: number };
  target: { x: number; y: number };
}) => {
  const midY = (source.y + target.y) / 2;
  const stub = 22;
  return `M ${source.x},${midY - stub} L ${source.x},${midY} L ${target.x},${midY} L ${target.x},${midY + stub}`;
};

// Convert flat people + relationships into react-d3-tree format.
// Rules:
//   - Couples (SPOUSE) are rendered as a single node showing both names.
//   - A spouse with no parents is absorbed into the couple node and removed as a root.
//   - A spouse who has parents appears in their own family subtree; their name is still
//     shown on the partner's node but they are NOT duplicated.
//   - Children shared by two parents only appear once (under the first parent processed).
//   - Siblings are sorted oldest → youngest (left → right) by DOB.
export function buildTreeData(people: Person[], relationships: Relationship[]): RawNodeDatum {
  const parentRels = relationships.filter((r) => r.type === "PARENT");
  const spouseRels = relationships.filter((r) => r.type === "SPOUSE");
  const hasParent = new Set(parentRels.map((r) => r.toPersonId));

  // Global set — once placed in the tree a person won't appear again.
  const placed = new Set<string>();

  function sortSiblings(arr: Person[]): Person[] {
    return arr.sort((a, b) => {
      if (a.birthOrder != null && b.birthOrder != null) return a.birthOrder - b.birthOrder;
      if (a.birthOrder != null) return -1;
      if (b.birthOrder != null) return 1;
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
    // Also absorbs in the reverse relationship direction if the other person has marriedIn:true,
    // so the married-in person always appears on the right regardless of how the relationship was entered.
    const absorbedSpouse = spouseRels
      .filter((r) => {
        if (r.fromPersonId === person.personId && !hasParent.has(r.toPersonId) && !placed.has(r.toPersonId)) return true;
        if (r.toPersonId === person.personId && !hasParent.has(r.fromPersonId) && !placed.has(r.fromPersonId)) {
          const other = people.find((p) => p.personId === r.fromPersonId);
          return !!other?.marriedIn;
        }
        return false;
      })
      .map((r) => {
        const otherId = r.fromPersonId === person.personId ? r.toPersonId : r.fromPersonId;
        return people.find((p) => p.personId === otherId);
      })
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

    const children = sortSiblings(
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
        spouseMarriedIn: (spouse?.marriedIn ?? !!absorbedSpouse) ? "true" : "false",
      },
      children: children.length > 0 ? children : undefined,
    };
  }

  if (people.length === 0) return { name: "Empty tree", children: [] };

  const roots = people.filter((p) => !hasParent.has(p.personId));

  // A rootless person whose spouse HAS parents will be absorbed as an
  // absorbedSpouse when that spouse's subtree is built. Processing them
  // as a root first would steal their spouse's children and break the tree.
  // Also skip marriedIn:true roots — they'll be absorbed by their spouse.
  const rootIds = new Set(roots.map((r) => r.personId));
  const willBeAbsorbed = new Set(
    roots
      .filter((r) =>
        // Root whose spouse has parents — will be absorbed when that spouse's subtree is built.
        spouseRels.some((s) => s.fromPersonId === r.personId && hasParent.has(s.toPersonId)) ||
        // Explicitly marked as married-in and has a non-married-in root spouse.
        (r.marriedIn && spouseRels.some((s) => {
          const otherId = s.fromPersonId === r.personId ? s.toPersonId
            : s.toPersonId === r.personId ? s.fromPersonId : null;
          return otherId && rootIds.has(otherId) && !people.find((p) => p.personId === otherId)?.marriedIn;
        }))
      )
      .map((r) => r.personId)
  );

  const rootNodes: RawNodeDatum[] = [];
  for (const root of roots) {
    if (!placed.has(root.personId) && !willBeAbsorbed.has(root.personId)) {
      rootNodes.push(buildNode(root, new Set()));
    }
  }

  if (rootNodes.length === 1) return rootNodes[0];
  return { name: "Family", children: rootNodes };
}
