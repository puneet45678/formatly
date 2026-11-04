import { formatInput } from "./formatInput";
import type { WorkerRequest, WorkerResponse } from "./workerClient";

// This file runs inside a Web Worker, so `self` is the worker's global scope.
// The project compiles with the DOM lib (where `self` is a Window), so we
// describe only the two things we use instead of pulling in the "webworker" lib.
const scope = self as unknown as {
  onmessage: ((event: { data: WorkerRequest }) => void) | null;
  postMessage(message: WorkerResponse): void;
};

// One message in, one message out. formatInput never throws, so the page
// always gets an answer for every id it sent.
scope.onmessage = async ({ data }) => {
  const result = await formatInput(data.format, data.input, data.settings);
  scope.postMessage({ id: data.id, result });
};
