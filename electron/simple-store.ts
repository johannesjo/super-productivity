import { promises as fs } from 'fs';
import { app } from 'electron';
import * as path from 'path';

const DATA_PATH = path.join(app.getPath('userData'), 'simpleSettings');

type SimpleStoreData = { [key: string]: unknown };

export const saveSimpleStore = async (
  dataKey = 'main',
  data: unknown,
): Promise<unknown> => {
  const prevData = await loadSimpleStoreAll();

  return await fs.writeFile(DATA_PATH, JSON.stringify({ ...prevData, [dataKey]: data }), {
    encoding: 'utf8',
  });
};

export const loadSimpleStoreAll = async (): Promise<SimpleStoreData> => {
  try {
    const data = await fs.readFile(DATA_PATH, { encoding: 'utf8' });
    console.log(data);
    console.log(JSON.parse(data));

    return JSON.parse(data);
  } catch (e) {
    console.error(e);
    return {};
  }
};
