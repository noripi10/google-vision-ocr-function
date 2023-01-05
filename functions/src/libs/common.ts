import * as fs from 'node:fs/promises';

export const rmExistsFileAsync = async (path: string) => {
  try {
    await fs.stat(path);
    await fs.rm(path);

    return true;
  } catch {
    return false;
  }
};
export const filterNonNullable = <T>(value: T): value is NonNullable<T> => value != null;
