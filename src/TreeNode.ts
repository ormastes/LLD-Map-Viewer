import { assert } from "console";

// TreeNode.ts
export class TreeNode {
    public children: TreeNode[] = [];
    public id: string;
    private size: number;
    private align: number;
    private vma: number;
    private lma: number;
    public expanded: boolean = false;
    // Class static variable
    public static currentNumberFormat: 'hex' | 'decimal' = 'hex';
  
    constructor(
      private symbol: string,
      size: string,
      align: string,
      vma: string,
      lma: string,
      public indent: number
    ) {
      this.id = generateId();
      // decimal number
      this.align = parseInt(align);
      // hex number
      this.size = parseInt(size, 16);
      this.vma = parseInt(vma, 16);
      this.lma = parseInt(lma, 16);
    }
    private converter(num: number): string {
      if (TreeNode.currentNumberFormat === 'hex') {
        return '0x' + num.toString(16);
      } else if (TreeNode.currentNumberFormat === 'decimal') {
        return num.toString();
      } else {
        assert(false, 'Invalid number format');
        return ''; // default return to satisfy TypeScript
      }
    }
    public getSizeNumber(): number {
      return this.size;
    }
    // get size as string
    public getSize(): string {
      return this.converter(this.size);
    }
    public getAlign(): string {
      return this.converter(this.align);
    }
    public getVma(): string {
      return this.converter(this.vma);
    }
    public getLma(): string {
      return this.converter(this.lma);
    }
    public getIndentString(): string {
      return '&nbsp;'.repeat(this.indent * 4);
    }
    public getSymbol(): string {
      // add space by indent
      return this.symbol;
    }
  }
  
  function generateId(): string {
    return '_' + Math.random().toString(36).substr(2, 9);
  }
  