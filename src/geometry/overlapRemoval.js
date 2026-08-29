export function removeNodeOverlaps(cy, { iterations = 4, gap = 26 } = {}) {
  let moved = false;
  const nodes = cy.nodes().toArray();
  for (let pass = 0; pass < iterations; pass++) {
    let changed = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const aSize = nodeDimensions(a);
        const bSize = nodeDimensions(b);
        const overlapX = (aSize.width + bSize.width) / 2 + gap - Math.abs(a.position().x - b.position().x);
        const overlapY = (aSize.height + bSize.height) / 2 + gap - Math.abs(a.position().y - b.position().y);
        if (overlapX <= 0 || overlapY <= 0) continue;
        const aLocked = a.locked();
        const bLocked = b.locked();
        if (aLocked && bLocked) continue;
        const horizontal = overlapX < overlapY;
        const direction = horizontal
          ? Math.sign(a.position().x - b.position().x) || 1
          : Math.sign(a.position().y - b.position().y) || 1;
        const displacement = horizontal ? { x: overlapX / 2 * direction, y: 0 } : { x: 0, y: overlapY / 2 * direction };
        if (!aLocked && !bLocked) {
          a.position({ x: a.position().x + displacement.x, y: a.position().y + displacement.y });
          b.position({ x: b.position().x - displacement.x, y: b.position().y - displacement.y });
        } else if (!aLocked) {
          a.position({ x: a.position().x + displacement.x * 2, y: a.position().y + displacement.y * 2 });
        } else {
          b.position({ x: b.position().x - displacement.x * 2, y: b.position().y - displacement.y * 2 });
        }
        changed = moved = true;
      }
    }
    if (!changed) break;
  }
  return moved;
}

function nodeDimensions(node) {
  const style = node.data("style") || {};
  const width = finitePositive(style.width) || finitePositive(style.size) || 90;
  const height = finitePositive(style.height) || finitePositive(style.size) || 90;
  return { width, height };
}

function finitePositive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}
