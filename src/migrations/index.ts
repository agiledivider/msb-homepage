import * as migration_20260708_190832_initial from './20260708_190832_initial';
import * as migration_20260723_100658_prose_block from './20260723_100658_prose_block';
import * as migration_20260724_005233_rbac_oidc_sub from './20260724_005233_rbac_oidc_sub';
import * as migration_20261120_090203_payload_3_93 from './20261120_090203_payload_3_93';
import * as migration_20261121_232740_folders from './20261121_232740_folders';
import * as migration_20261122_012602_claude_mcp from './20261122_012602_claude_mcp';
import * as migration_20261122_013913_media_uploaded_by_claude from './20261122_013913_media_uploaded_by_claude';
import * as migration_20261122_024732_mcp_preview_link_tool from './20261122_024732_mcp_preview_link_tool';

export const migrations = [
  {
    up: migration_20260708_190832_initial.up,
    down: migration_20260708_190832_initial.down,
    name: '20260708_190832_initial',
  },
  {
    up: migration_20260723_100658_prose_block.up,
    down: migration_20260723_100658_prose_block.down,
    name: '20260723_100658_prose_block',
  },
  {
    up: migration_20260724_005233_rbac_oidc_sub.up,
    down: migration_20260724_005233_rbac_oidc_sub.down,
    name: '20260724_005233_rbac_oidc_sub',
  },
  {
    up: migration_20261120_090203_payload_3_93.up,
    down: migration_20261120_090203_payload_3_93.down,
    name: '20261120_090203_payload_3_93',
  },
  {
    up: migration_20261121_232740_folders.up,
    down: migration_20261121_232740_folders.down,
    name: '20261121_232740_folders',
  },
  {
    up: migration_20261122_012602_claude_mcp.up,
    down: migration_20261122_012602_claude_mcp.down,
    name: '20261122_012602_claude_mcp',
  },
  {
    up: migration_20261122_013913_media_uploaded_by_claude.up,
    down: migration_20261122_013913_media_uploaded_by_claude.down,
    name: '20261122_013913_media_uploaded_by_claude',
  },
  {
    up: migration_20261122_024732_mcp_preview_link_tool.up,
    down: migration_20261122_024732_mcp_preview_link_tool.down,
    name: '20261122_024732_mcp_preview_link_tool'
  },
];
