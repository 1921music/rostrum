// +skip
export { LibraryTransferQueue };
// -skip

// Network I/O is asynchronous; SQLite stays in its existing storage Worker.
// One file transfers at a time. A foreground request promotes a waiting job,
// shares an active one, and never interrupts an upload midway through publish.
class LibraryTransferQueue extends EventTarget {
  constructor() { super(); this.jobs = new Map(); this.active = null; this.back = 0; this.front = 0; this.completed = 0; this.failed = 0; this.cancelled = 0; this.batches = 0; }
  resetProgress() { this.completed = this.failed = this.cancelled = 0; }
  beginBatch() { if (!this.batches && !this.size) this.resetProgress(); this.batches++; this.changed(); }
  endBatch() { this.batches--; this.changed(); }
  get size() { return this.jobs.size; }
  changed() { this.dispatchEvent(new Event('change')); }
  enqueue(key, run, {priority = 0,front = false,label = '',direction = 'download',group = ''} = {}) {
    if (this.jobs.has(key)) { this.promote(key,{priority,front}); return this.jobs.get(key).promise; }
    if (!this.jobs.size && !this.batches) this.resetProgress();
    let resolve,reject;
    const promise = new Promise((yes,no) => { resolve = yes; reject = no; });
    // Queued jobs can be cancelled before a caller starts awaiting the batch.
    promise.catch(() => {});
    this.jobs.set(key,{key,run,priority,order:front ? --this.front : ++this.back,label,direction,group,resolve,reject,promise,state:'queued'});
    this.changed(); queueMicrotask(() => this.pump()); return promise;
  }
  promote(key,{priority = 0,front = true} = {}) {
    const job = this.jobs.get(key); if (!job || job.state !== 'queued') return;
    job.priority = Math.max(priority,job.priority); if (front) job.order = --this.front;
    this.changed();
  }
  cancelWaiting(group) {
    for (const [key,job] of this.jobs) if (job.state === 'queued' && job.group === group && job.priority === 0) {
      this.jobs.delete(key); this.cancelled++; job.reject(new DOMException('Download cancelled','AbortError'));
    }
    this.changed();
  }
  async pump() {
    if (this.active) return;
    const job = [...this.jobs.values()].sort((a,b) => b.priority - a.priority || a.order - b.order)[0];
    if (!job) return;
    this.active = job; job.state = 'running'; this.changed();
    try { const value = await job.run(); this.completed++; job.resolve(value); }
    catch (error) { this.failed++; job.reject(error); }
    finally { this.jobs.delete(job.key); this.active = null; job.run = null; this.changed(); queueMicrotask(() => this.pump()); }
  }
}
