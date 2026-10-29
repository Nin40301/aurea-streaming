const { version } = require("./package.json");
module.exports = {
  packagerConfig: {
    asar: true,
    executableName: "Aurea",
    icon: "assets/aurea.ico",
    extraResource: ["assets"],
    ignore: [
      /^\/src($|\/)/,
      /^\/tests($|\/)/,
      /^\/scripts($|\/)/,
      /^\/work($|\/)/,
      /^\/test-results($|\/)/,
      /^\/playwright-report($|\/)/,
      /^\/assets($|\/)/,
      /^\/node_modules($|\/)/,
    ],
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "Aurea",
        setupExe: `Aurea-${version}-Setup.exe`,
        setupIcon: "assets/aurea.ico",
        noMsi: true,
      },
    },
    { name: "@electron-forge/maker-zip", platforms: ["win32"] },
  ],
};
