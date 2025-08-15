export class CollectionResource {
  protected items: object[];

  protected meta: {[key: string]: string | object | number | boolean};

  constructor(items: object[] = []) {
    this.items = items;
  }

  public addMeta(key: string, value: any) {
    if (!this.meta) {
      this.meta = {};
    }
    this.meta[key] = value;
  }
}
