export async function viaPersistence<T>(
  path: string,
  func: () => Promise<T>
): Promise<T> {
  const file = Bun.file(path);
  if (await file.exists()) {
    return file.json();
  }
  const output = await func();
  await Bun.write(path, JSON.stringify(output, null, 2));
  return output;
}

export async function load<T>(path: string): Promise<T | undefined> {
  const file = Bun.file(path);
  if (await file.exists()) {
    return file.json();
  }

  return undefined;
}

export async function save<T>(path: string, data: T): Promise<void> {
  await Bun.write(path, JSON.stringify(data, null, 2));
}
