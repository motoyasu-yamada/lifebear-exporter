import { mkdirSync } from "fs";

export function temp_filepath(name: string, dir?: string): string {
  const baseDir = temp_dirpath(dir);
  return `${baseDir}/${name}`;
}

export function temp_dirpath(name?: string): string {
  const dir = name ? `.temp/${name}` : ".temp";
  mkdirSync(dir, { recursive: true });
  return dir;
}
