export class EntityStore {
  private entities: any[];

  constructor(dbPath: string = '') {
    this.entities = [];
  }

  add(type: string, data: any) {
    this.entities.push({
      type,
      data
    });
  }

  getAll() {
    return this.entities;
  }

  summary() {
    return JSON.stringify(this.entities, null, 2);
  }
}
