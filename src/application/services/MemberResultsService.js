'use strict';

const ResultSetDto = require('../dto/ResultSetDto');

class MemberResultsService {
  constructor(repo) {
    this.repo = repo;
  }

  findPrevious(memberId, currentId) {
    const current = this.repo.find(currentId);
    const items = this.repo.findByMember(memberId)
      .filter((rs) => rs.id !== currentId)
      .sort((a, b) => (a.collectionDate || '').localeCompare(b.collectionDate || ''));

    if (!current) return items[items.length - 1] || null;
    return items.filter((rs) => (rs.collectionDate || '') < (current.collectionDate || '')).at(-1) || null;
  }

  findForMember(memberId) {
    return this.repo.findByMember(memberId)
      .filter((rs) => rs.isVisibleToMember())
      .sort((a, b) => (b.collectionDate || '').localeCompare(a.collectionDate || ''))
      .map((rs) => ResultSetDto.fromResultSet(rs, this.findPrevious(rs.memberId, rs.id)));
  }

  findOne(memberId, id) {
    const rs = this.repo.find(id);
    if (!rs || rs.memberId !== memberId || !rs.isVisibleToMember()) return null;
    return ResultSetDto.fromResultSet(rs, this.findPrevious(rs.memberId, rs.id));
  }
}

module.exports = MemberResultsService;
