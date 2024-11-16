// TreeNode.ts
export class TreeNode {
    public children: TreeNode[] = [];
    public id: string;
  
    constructor(
      public symbol: string,
      public size: string,
      public align: string,
      public vma: string,
      public lma: string,
      public indent: number
    ) {
      this.id = generateId();
    }
  }
  
  function generateId(): string {
    return '_' + Math.random().toString(36).substr(2, 9);
  }
  