/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: [
    "./App.tsx",
    "./index.ts",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./global.css",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: { sans: ['myFont'] },
      colors: {
        "my-white-light": "#fff2d9",
        "my-white-base": "#ffe0a3",
        "my-white-dark": "#fcca68",
        "my-red-light": "#ff8ca1",
        "my-red-base": "#f2055c",
        "my-red-dark": "#ad0241",
        "my-green-light": "#69d1a4",
        "my-green-base": "#0bb07c",
        "my-green-dark": "#076346",
        "my-blue-light": "#a1dde3",
        "my-blue-base": "#0edbed",
        "my-blue-dark": "#038894",
        "my-black-light": "#484848",
        "my-black-base": "#242424",
        "my-black-dark": "#121212",
      },
    },
  },
  plugins: [],
};
