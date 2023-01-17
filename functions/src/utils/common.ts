import * as fs from 'node:fs/promises';

import * as dotenv from 'dotenv';

dotenv.config();

export const getEnv = () => {
  const channelSecret = process.env.CHANNEL_SECRET;
  const channelAccessToken = process.env.CHANNEL_ACCESS_TOKEN;
  const privateKey = process.env.PRIVATE_KEY;
  const clientEmail = process.env.CLIENT_EMAIL;

  return {
    channelSecret,
    channelAccessToken,
    privateKey,
    clientEmail,
  };
};

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
