// Minimal shim for Expo's reconcileTransformSerializerPlugin which expects
// `metro/src/ModuleGraph/worker/importLocationsPlugin` to export `locToKey`.
// Newer Metro versions moved/guarded this path behind exports; some versions
// don't include it. For our purposes, we only need a stable key for locations.
// A simple start/end based key is sufficient.

function locToKey(loc) {
  if (!loc) return "0:0-0:0";
  const s = loc.start || { line: 0, column: 0 };
  const e = loc.end || { line: 0, column: 0 };
  return `${s.line}:${s.column}-${e.line}:${e.column}`;
}

// Provide a no-op Babel plugin so callers importing
// `importLocationsPlugin` receive a valid plugin function.
// This satisfies @expo/metro-config which injects this
// plugin into Babel when bundling. We don't need any
// behavior here for our use case.
function importLocationsPlugin() {
  return {
    name: "metro-import-locations-shim",
    visitor: {},
  };
}

module.exports = { locToKey, importLocationsPlugin };
