'use strict';

const ResultSetDto = require('../dto/ResultSetDto');

class ReviewService {
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

  getQueue() {
    return this.repo.findAll()
      .filter((rs) => rs.isAwaitingReview())
      .sort((a, b) => (b.collectionDate || '').localeCompare(a.collectionDate || ''))
      .map((rs) => ResultSetDto.queueItem(rs));
  }

  detail(id) {
    const rs = this.repo.find(id);
    if (!rs) return null;
    return ResultSetDto.fromResultSet(rs, this.findPrevious(rs.memberId, rs.id));
  }

  release(id, body, clinicianName) {
    const rs = this.repo.find(id);
    if (!rs) {
      const err = new Error(`Result set ${id} not found`);
      err.statusCode = 404;
      throw err;
    }

    let guidance = '';
    let doctor = clinicianName;
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      guidance = typeof body.body === 'string' ? body.body : typeof body.guidance === 'string' ? body.guidance : '';
      doctor = body.clinicianName ?? body.doctor ?? clinicianName;
    } else if (typeof body === 'string') {
      guidance = body;
    }

    rs.release(guidance, doctor);
    this.repo.save(rs);

    return {
      body: rs.guidance,
      clinicianName: rs.releasedBy,
    };
  }
}

module.exports = ReviewService;
