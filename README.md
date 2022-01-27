# React Chrome Extension MV3 Starter

A boilerplate to get you started with developing chrome extensions (manifest v3) in `react` and `typescript`, with little to zero configuration.

## Features

- React
- Typescript
- Sass/Css
- Manifest Version 3
- Supports up to ES2021 syntax (using babel)
- Browserslist
- Create custom html pages and UI Elements — see [Custom Pages](#custom-pages)
- Create as many scripts as you want, with ES module support and auto build
- Webpack v5
- Dev server with live reloading

---

## Content

1. [Install](#install)
2. [Dev Server](#dev-server)
3. [Build](#build)
   - [Dev Build](#dev-build)
   - [Watch Build](#watch-build)
   - [Prod Build](#prod-build)
4. [Usage](#usage)
   - [Custom Pages](#custom-pages)
   - [Scripts](#scripts)
5. [Manifest](#manifest)
6. [Service Worker](#service-worker)
7. [Advance Config](#advance-config)
   - [Webpack](#webpack)
   - [Eslint](#eslint)
8. [LICENSE](#license)

## Install

Clone repo

```bash
$ git clone https://github.com/Sirage-t/react-chrome-extension-MV3.git
$ cd react-chrome-extension-MV3
```

or Download zipped from `code` (the green button at the top) then `Download ZIP`.

Navigate to `react-chrome-extension-MV3` directory, then:

```bash
# if you prefer npm
$ npm install

# if you prefer yarn
$ yarn install
```

## Dev Server

To use `webpack-dev-server` with hot module reloading enabled by default, run:

```bash
# npm
$ npm start

# or yarn
$ yarn start
```

Use the **Dev Server** when designing your extension and **Build** when you want to test it in Chrome.

**Note**: you need to build if you want to use/test Chrome API.

## Build

You can build the project in three ways depending on your need. All three will create a `build` folder at the root of your project directory.

### Dev Build

Build the extension in development mode, with sourcemaps and un-minified code. Useful when testing in Chrome browser. Sourcemaps will help you locate errors in your original typescript code.

```bash
# if you prefer npm
$ npm run dev

# if you prefer yarn
$ yarn run dev
```

### Watch Build

Same as above (`dev`) but with `--watch` enabled. This will watch for any changes and automatically rebuild so you don't have to run `dev` every single time you make a change.

```bash
# npm
$ npm run watch

# yarn
$ yarn run watch
```

### Prod Build

Build for production, minified, no comments, and no sourcemaps.

```bash
# npm
$ npm run build

# yarn
$ yarn run build
```

## Usage

The main goal when I created the tool was to make it as flexible as possible and cover as many use cases out of the box, with minimal to no configuration (no need to touch webpack config file). To this end, you can also create custom react pages (see [Custom Pages](#custom-pages)), and scripts (standalone typescript files — see [Scripts](#scripts)) that will automatically be build for you when detected.

Four default 'pages' are provided out of the box, `popup`, `options`, `newtab`, and `onboarding`. To get started:

1. Clean manifest.json — see [Manifest](#manifest)
2. Delete pages that you don't need (eg 'onboarding', 'newtab' etc)
3. Start by editing the `App.tsx` in the desired default page
4. Or, create your own custom page — see [Custom Pages](#custom-pages)
5. Enjoy coding :)

### Custom Pages

In addition to the default pages: `popup`, `options`, `newtab`, and `onboarding`, you can create your own custom html page powered by react.

1. Create a new folder inside `src/UIElements` (folder name will be the name of the output html file)
2. Inside the new folder create an `index.html`, `index.tsx`, and `App.tsx` (you can copy these from `popup` or any other folder)
3. The content of these files is similar to `create-react-app` if you have used that before.

Note: both `index.html` and `index.tsx` are required and the name must be exact. You can `App.tsx` whatever you want as long as you import it correctly in `index.tsx`.

**Output**: your custom page will be accessible from `build/[folder name].html`. If you want to inject the html via a content script, the script must point to the parent directory `../[folder name].html`, as all javascript files will be emitted to `build/js` (except service worker).

Any js or css files (including react) will be automatically added to your html file. No need to manually add \<script\> or \<style\> tags

### Scripts

If you want to create a standalone javascript file, like a content script, you can do so by:

1. Creating a new folder inside `src/scripts`
2. Creating an `index.ts` inside that folder
3. Have fun coding :)

Note 1: In `index.ts` you can use ES modules as well.

Note 2: The emitted js will be in `js/[folder name].js`.\

Note 3: `index.ts` is required. Webpack uses this as the entry point. If you don't have an `index.ts` file the build will fail.

## Manifest

Make sure to leave only what you need in `manifest.json`. Other properties must be deleted to avoid errors and compromising your extension.

Please refer to this [page](https://developer.chrome.com/docs/extensions/mv3/manifest/) for a summary of what properties are required/supported.

Note: the `name`, `version` and `description` properties will be automatically added to the `manifest.json` from the `package.json` during build process. Only update them from `package.json`.

## Service Worker

The service worker is in its own folder as it needs to be emitted directly in the `build` folder (can't be in a nested folder). If moved to `build/js` the extension will raise an error when loaded onto Chrome.

Only one service worker is allowed in manifest v3, but you can use ES modules. Make sure to import them in `serviceworker/index.ts`, webpack will take care of the rest.

---

## Advance Config

### Webpack

You can config webpack.config.js however you want.

### Eslint

The tool uses `Airbnb` style, if you don't like it feel free to change it in `.eslintrc.json`.

## License

[MIT](https://github.com/Sirage-t/react-chrome-extension-MV3/blob/master/LICENSE) @ [Sirage-T](https://github.com/Sirage-t)
Feel free to use the tool however you want.
