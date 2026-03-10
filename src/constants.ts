export const SERVER_NAME = "forge-mcp-server";
export const SERVER_VERSION = "0.1.0";

export const FORGE_DIRECTORY_NAME = ".forge";
export const GLOBAL_DIRECTORY_NAME = ".forge";
export const GLOBAL_FILE_NAME = "global.json";
export const MEMORY_FILE_NAME = "memory.json";
export const PLAN_FILE_NAME = "plan.json";
export const PHASES_FILE_NAME = "phases.json";
export const ISSUES_AND_NICETIES_ASKED_FILE_NAME = "issues-and-niceties-asked.json";

export const FILE_SCHEMA_VERSION = 1;

export const PROJECT_TOOL_NAMES = [
  "forge_init",
  "forge_load",
  "forge_compare_execution",
  "forge_suggest_update",
  "forge_session_draft",
  "forge_update",
  "forge_log",
  "forge_step_done",
  "forge_checkpoint",
  "forge_rebuild_phases",
  "forge_flag_drift",
  "forge_session_end"
] as const;
