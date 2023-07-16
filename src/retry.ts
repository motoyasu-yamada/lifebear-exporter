import { sleep } from "./sleep";

const S = 1000;
const M = S * 60;
const H = M * 60;
const WAIT_TABLE = [500, 3 * S, 6 * S, 30 * S, 1 * M, 5 * M, 15 * M, 1 * H, 3 * H, 6 * H, 12 * H, 24 * H];

export class UnretryableError extends Error {}

export async function retry<T>(func: () => Promise<T>): Promise<T> {
  let waitIndex = 0;
  return await (async () => {
    for (;;) {
      try {
        const response = await func();
        waitIndex = 0;
        return response;
      } catch (error) {
        if (error instanceof UnretryableError) {
          throw error;
        }
        console.error(error);
        waitIndex = Math.min(waitIndex + 1, WAIT_TABLE.length - 1);
      } finally {
        const wait = WAIT_TABLE[waitIndex];
        if (waitIndex != 0) {
          console.log(`${wait / S} 秒後に再試行します`);
        }
        await sleep(wait);
      }
    }
  })();
}
