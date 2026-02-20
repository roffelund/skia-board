const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Watch the parent directory so Metro can resolve the local skia-board source
config.watchFolders = [workspaceRoot];

// Ensure dependencies are resolved from the example's node_modules first
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];

// Block both the library's root node_modules and the nested copy inside
// the example's node_modules/skia-board, so all deps resolve from example/.
const escape = (p) => p.replace(/[/\\]/g, "[/\\\\]");
config.resolver.blockList = [
  new RegExp(`${escape(path.resolve(workspaceRoot, "node_modules"))}.*`),
  new RegExp(
    `${escape(path.resolve(projectRoot, "node_modules", "skia-board", "node_modules"))}.*`,
  ),
];

module.exports = config;
