import * as migration_20260708_190832_initial from './20260708_190832_initial';

export const migrations = [
  {
    up: migration_20260708_190832_initial.up,
    down: migration_20260708_190832_initial.down,
    name: '20260708_190832_initial'
  },
];
