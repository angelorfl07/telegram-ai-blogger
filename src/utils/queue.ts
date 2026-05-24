type QueueTask<T> = () => Promise<T>;

export class AsyncQueue {
  private running = 0;
  private readonly pending: Array<() => void> = [];

  public constructor(private readonly concurrency: number) {}

  public enqueue<T>(task: QueueTask<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        this.running += 1;
        task()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            this.running -= 1;
            const next = this.pending.shift();
            if (next) next();
          });
      };

      if (this.running < this.concurrency) run();
      else this.pending.push(run);
    });
  }

  public stats() {
    return { running: this.running, pending: this.pending.length, concurrency: this.concurrency };
  }
}
