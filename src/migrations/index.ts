import * as migration_20260708_190832_initial from './20260708_190832_initial';
import * as migration_20260723_100658_prose_block from './20260723_100658_prose_block';
import * as migration_20260724_005233_rbac_oidc_sub from './20260724_005233_rbac_oidc_sub';
import * as migration_20261120_090203_payload_3_93 from './20261120_090203_payload_3_93';
import * as migration_20261121_232740_folders from './20261121_232740_folders';
import * as migration_20261122_012602_claude_mcp from './20261122_012602_claude_mcp';
import * as migration_20261122_013913_media_uploaded_by_claude from './20261122_013913_media_uploaded_by_claude';
import * as migration_20261122_024732_mcp_preview_link_tool from './20261122_024732_mcp_preview_link_tool';
import * as migration_20261122_031734_media_ai_label from './20261122_031734_media_ai_label';
import * as migration_20261122_104113_footer_contact_social from './20261122_104113_footer_contact_social';
import * as migration_20261122_130104_verein_people_block from './20261122_130104_verein_people_block';
import * as migration_20261122_144523_verein_press_block from './20261122_144523_verein_press_block';
import * as migration_20261122_173633_verein_columns from './20261122_173633_verein_columns';
import * as migration_20261122_175817_verein_documents_block from './20261122_175817_verein_documents_block';
import * as migration_20261122_183227_verein_supporters_block from './20261122_183227_verein_supporters_block';
import * as migration_20261122_204057_event_subtitle from './20261122_204057_event_subtitle';
import * as migration_20261123_203510_workshop_cards from './20261123_203510_workshop_cards';
import * as migration_20261123_212816_workshops_collection from './20261123_212816_workshops_collection';
import * as migration_20261123_214954_mcp_workshops from './20261123_214954_mcp_workshops';
import * as migration_20261124_012207_german_hero_lede from './20261124_012207_german_hero_lede';
import * as migration_20261124_014146_open_drafts_last_editor from './20261124_014146_open_drafts_last_editor';
import * as migration_20261125_224032_site_opening_hours_calendar from './20261125_224032_site_opening_hours_calendar';
import * as migration_20261125_231747_site_opening_hours_show from './20261125_231747_site_opening_hours_show';

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
    name: '20261122_024732_mcp_preview_link_tool',
  },
  {
    up: migration_20261122_031734_media_ai_label.up,
    down: migration_20261122_031734_media_ai_label.down,
    name: '20261122_031734_media_ai_label',
  },
  {
    up: migration_20261122_104113_footer_contact_social.up,
    down: migration_20261122_104113_footer_contact_social.down,
    name: '20261122_104113_footer_contact_social',
  },
  {
    up: migration_20261122_130104_verein_people_block.up,
    down: migration_20261122_130104_verein_people_block.down,
    name: '20261122_130104_verein_people_block',
  },
  {
    up: migration_20261122_144523_verein_press_block.up,
    down: migration_20261122_144523_verein_press_block.down,
    name: '20261122_144523_verein_press_block',
  },
  {
    up: migration_20261122_173633_verein_columns.up,
    down: migration_20261122_173633_verein_columns.down,
    name: '20261122_173633_verein_columns',
  },
  {
    up: migration_20261122_175817_verein_documents_block.up,
    down: migration_20261122_175817_verein_documents_block.down,
    name: '20261122_175817_verein_documents_block',
  },
  {
    up: migration_20261122_183227_verein_supporters_block.up,
    down: migration_20261122_183227_verein_supporters_block.down,
    name: '20261122_183227_verein_supporters_block',
  },
  {
    up: migration_20261122_204057_event_subtitle.up,
    down: migration_20261122_204057_event_subtitle.down,
    name: '20261122_204057_event_subtitle',
  },
  {
    up: migration_20261123_203510_workshop_cards.up,
    down: migration_20261123_203510_workshop_cards.down,
    name: '20261123_203510_workshop_cards',
  },
  {
    up: migration_20261123_212816_workshops_collection.up,
    down: migration_20261123_212816_workshops_collection.down,
    name: '20261123_212816_workshops_collection',
  },
  {
    up: migration_20261123_214954_mcp_workshops.up,
    down: migration_20261123_214954_mcp_workshops.down,
    name: '20261123_214954_mcp_workshops',
  },
  {
    up: migration_20261124_012207_german_hero_lede.up,
    down: migration_20261124_012207_german_hero_lede.down,
    name: '20261124_012207_german_hero_lede',
  },
  {
    up: migration_20261124_014146_open_drafts_last_editor.up,
    down: migration_20261124_014146_open_drafts_last_editor.down,
    name: '20261124_014146_open_drafts_last_editor',
  },
  {
    up: migration_20261125_224032_site_opening_hours_calendar.up,
    down: migration_20261125_224032_site_opening_hours_calendar.down,
    name: '20261125_224032_site_opening_hours_calendar',
  },
  {
    up: migration_20261125_231747_site_opening_hours_show.up,
    down: migration_20261125_231747_site_opening_hours_show.down,
    name: '20261125_231747_site_opening_hours_show'
  },
];
