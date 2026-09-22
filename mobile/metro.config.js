const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// The web app's platform-free logic (habits.js, streaks.js, validation.js) is
// imported as-is via the `@shared/*` alias in jsconfig.json. Metro only
// bundles files it watches, so the web lib folder is added here. Only files
// listed as portable in docs/platform-audit.md may be imported from it.
config.watchFolders = [path.resolve(__dirname, '../src/lib')]

module.exports = withNativeWind(config, { input: './global.css' })
