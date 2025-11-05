import ora from 'ora';

export function withSpinner<T>(text: string, fn: () => Promise<T>): Promise<T> {
  const s = ora(text).start();
  return fn()
    .then((res) => {
      s.succeed(text);
      return res;
    })
    .catch((err) => {
      s.fail(text);
      throw err;
    });
}


