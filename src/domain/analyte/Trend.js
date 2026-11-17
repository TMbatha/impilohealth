'use strict';

const DIRECTIONS = Object.freeze({
  IMPROVED: 'improved',
  UNCHANGED: 'unchanged',
  WORSENED: 'worsened',
  FIRST: 'first',
});

class Trend {
  constructor(direction, delta = null, pctDelta = null) {
    if (!Object.values(DIRECTIONS).includes(direction)) throw new Error(`Bad trend direction: ${direction}`);
    this.direction = direction;
    this.delta = delta;
    this.pctDelta = pctDelta;
    Object.freeze(this);
  }

  toJSON() {
    return { direction: this.direction, delta: this.delta, pctDelta: this.pctDelta };
  }
}

Trend.DIRECTIONS = DIRECTIONS;
Trend.first = () => new Trend(DIRECTIONS.FIRST);

module.exports = Trend;
