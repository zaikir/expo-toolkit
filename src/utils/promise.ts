export class PromiseUtils {
  /**
   * Returns a promise that resolves after a specified delay
   * @param ms time in milliseconds to wait
   * @returns a promise that resolves after the specified delay
   */
  static wait(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Executes a promise with a specified timeout.
   *
   * @template T The type of the promise result
   * @param promise The promise to execute
   * @param timeout The time in milliseconds before timing out (5000 ms by default)
   * @param error An optional error message to use on timeout
   */
  static timeout<T>(promise: T, timeout: number | null = 5000, error?: string) {
    return Promise.race<T>([
      typeof promise === 'function' ? promise() : promise,
      new Promise((_, reject) => {
        if (timeout !== null) {
          setTimeout(
            () => reject(new Error(error ?? 'Timeout error')),
            timeout,
          );
        }
      }),
    ]);
  }
}

export class ControlledPromise<T> {
  promise: Promise<T>;

  // @ts-expect-error
  resolve: (value: T | PromiseLike<T>) => void;

  // @ts-expect-error
  reject: (reason?: any) => void;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  wait() {
    return this.promise;
  }
}
