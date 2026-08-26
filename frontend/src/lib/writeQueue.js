/**
 * Keep full-snapshot writes in invocation order.
 *
 * Optimistic forms often send the whole current object. Without ordering, a
 * slow older request can finish after a newer one and leave the server holding
 * stale data. A rejected write is swallowed only for purposes of advancing the
 * queue; the caller still receives that rejection and can report it.
 */
export function createWriteQueue(writer) {
  let tail = Promise.resolve();

  return (value) => {
    const pending = tail.catch(() => undefined).then(() => writer(value));
    tail = pending;
    return pending;
  };
}
