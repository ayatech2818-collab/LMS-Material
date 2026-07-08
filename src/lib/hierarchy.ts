export type HierarchyType = "board" | "class" | "subject" | "chapter";

export type HierarchyNode = {
  id: string;
  type: HierarchyType;
  name: string;
  parent_id: string | null;
};

/** Walks parent_id up from nodeId and joins names root-first, e.g. "CBSE › Grade 5 › Maths". */
export function getBreadcrumb(nodeId: string, allNodes: HierarchyNode[]): string {
  const byId = new Map(allNodes.map((n) => [n.id, n]));
  const names: string[] = [];
  let current = byId.get(nodeId);
  while (current) {
    names.unshift(current.name);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return names.join(" › ");
}
