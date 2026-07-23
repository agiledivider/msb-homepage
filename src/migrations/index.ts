import * as migration_20260708_190832_initial from './20260708_190832_initial';
import * as migration_20260723_100658_prose_block from './20260723_100658_prose_block';

export const migrations = [
  {
    up: migration_20260708_190832_initial.up,
    down: migration_20260708_190832_initial.down,
    name: '20260708_190832_initial',
  },
  {
    up: migration_20260723_100658_prose_block.up,
    down: migration_20260723_100658_prose_block.down,
    name: '20260723_100658_prose_block'
  },
];
