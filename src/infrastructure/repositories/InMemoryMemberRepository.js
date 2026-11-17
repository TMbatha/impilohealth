'use strict';

class InMemoryMemberRepository {
  constructor(initial = []) {
    this.store = new Map();
    for (const m of initial) this.save(m);
  }

  save(member) {
    this.store.set(member.id, member);
    return member;
  }

  find(id) {
    return this.store.get(id) || null;
  }

  findAll() {
    return [...this.store.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
}

module.exports = InMemoryMemberRepository;
