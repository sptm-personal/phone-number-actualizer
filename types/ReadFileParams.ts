import { Abortable } from 'node:events';
import { OpenMode } from 'node:fs';

type ReadFileParams = {
  path: string;
  options?:
    | ({
        encoding?: null | undefined;
        flag?: OpenMode | undefined;
      } & Abortable)
    | null;
};

export { ReadFileParams };
