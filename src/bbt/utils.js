
function toHex (v) {
  return v.toString(16).padStart(64, '0');
}

export function printTree (tree) {
  const todo = [tree.root];
  let lastNode = ['"root"'];
  let res = 'digraph{nodesep=0.4;ranksep=0.5;node [shape="box" style="filled" fillcolor=white];\n';

    while (todo.length) {
      const node = todo.shift();
      const isBranch = node.isBranch;
      const l = (node.left ? toHex(node.left.hash) : toHex(BIG_ZERO)).slice(-8);
      const r = (node.right ? toHex(node.right.hash) : toHex(BIG_ZERO)).slice(-8);
      const hash = toHex(node.hash).slice(-8);

      const lBranch = node.left ? node.left.isBranch : false;
      const rBranch = node.right ? node.right.isBranch : false;

      const ltag = `"left:${l} - ${hash}"`;
      const rtag = `"right:${r} - ${hash}"`;

      const last = lastNode.shift();
      res += `node [fillcolor=${lBranch ? 'white' : 'grey'}]\n`;
      res += `${last} -> ${ltag}[color=blue];\n`;
      res += `node [fillcolor=${rBranch ? 'white' : 'grey'}]\n`;
      res += `${last} -> ${rtag}[color=red];\n`;

      if (node.left) {
        if (node.left.isBranch) {
          todo.push(node.left);
          lastNode.push(ltag);
        }
      }
      if (node.right) {
        if (node.right.isBranch) {
          todo.push(node.right);
          lastNode.push(rtag);
        }
      }
    }

    return res + '}';
}
