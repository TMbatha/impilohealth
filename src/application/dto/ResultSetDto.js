'use strict';

const domain = require('../../domain');

class ResultSetDto {
  static fromResultSet(resultSet, previousResultSet = null) {
    if (!resultSet) return null;
    return domain.classifyResultSet(resultSet, previousResultSet || null);
  }

  static queueItem(resultSet) {
    const dto = this.fromResultSet(resultSet, null);
    return {
      id: dto && dto.id,
      memberName: dto && dto.memberName,
      collectionDate: dto && dto.collectionDate,
      urgent: Boolean(dto && dto.urgent),
    };
  }
}

module.exports = ResultSetDto;
