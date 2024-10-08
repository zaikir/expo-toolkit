export class PromiseUtils {
  /**
   * Returns a promise that resolves after a specified delay
   * @param ms time in milliseconds to wait
   * @returns a promise that resolves after the specified delay
   */
  static wait(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
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
