import spark from 'spark-md5';

export const md5HashSync = (str: string): string => {
  return spark.hash(str);
};

export const md5HashPromise = (str: string): Promise<string> => {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      const hash = spark.hash(str);
      resolve(hash);
    }, 0);
  });
};
