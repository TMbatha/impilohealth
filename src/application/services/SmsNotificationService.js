'use strict';

/**
 * Sends the "your results are ready" SMS when a clinician releases a result set.
 *
 * Deliberately contains NO test values: health results never travel by SMS, only the
 * nudge to open the app. Delivery is simulated into an in-memory outbox; swapping in a
 * real gateway (Clickatell, Twilio, ...) means replacing `deliver()` only.
 */
const DEMO_CONTACTS = { m1: '+27821234821' };

const fmtDate = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

const mask = (phone) => phone.replace(/^(\+\d{2})(\d{2})\d+(\d{4})$/, '$1 $2 ••• $3');

class SmsNotificationService {
  /** contacts: { memberId: phone } or a function memberId -> phone. */
  constructor(contacts = DEMO_CONTACTS) {
    this.lookup = typeof contacts === 'function' ? contacts : (id) => contacts[id];
    this.outbox = [];
  }

  resultsReleased(resultSet) {
    const to = this.lookup(resultSet.memberId);
    if (!to) return null;
    const firstName = String(resultSet.memberName || '').replace(/\s*\(demo\)/, '').split(' ')[0] || 'there';
    const body = `Impilo: Hi ${firstName}, your blood test results from ${fmtDate(resultSet.collectionDate)} `
      + `have been reviewed by ${resultSet.releasedBy}. Open the Impilo app to view them.`;
    return this.deliver({ memberId: resultSet.memberId, resultSetId: resultSet.id, to, body });
  }

  deliver(message) {
    const sms = {
      id: `sms${this.outbox.length + 1}`,
      ...message,
      toMasked: mask(message.to),
      chars: message.body.length,
      segments: Math.ceil(message.body.length / 160),
      status: 'sent (simulated)',
      sentAt: new Date().toISOString(),
    };
    this.outbox.push(sms);
    return sms;
  }

  /** Member-facing view: masked number, newest first. */
  forMember(memberId) {
    return this.outbox
      .filter((m) => m.memberId === memberId)
      .map(({ to, ...rest }) => rest)
      .reverse();
  }
}

module.exports = SmsNotificationService;
