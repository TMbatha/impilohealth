'use strict';

class InMemoryResultSetRepository {
  constructor(initialResults = []) {
    this.store = new Map();
    this.seed(initialResults);
  }

  save(rs) {
    if (!rs || !rs.id) throw new Error('ResultSet requires an id');
    this.store.set(rs.id, rs);
    return rs;
  }

  add(rs) {
    return this.save(rs);
  }

  find(id) {
    return this.store.get(id) || null;
  }

  findAll() {
    return [...this.store.values()].sort((a, b) => (b.collectionDate || '').localeCompare(a.collectionDate || ''));
  }

  findByMember(memberId) {
    return this.findAll().filter((rs) => rs.memberId === memberId);
  }

  seed(results) {
    for (const rs of results || []) this.save(rs);
    return this;
  }

  clear() {
    this.store.clear();
    return this;
  }
}

module.exports = InMemoryResultSetRepository;
