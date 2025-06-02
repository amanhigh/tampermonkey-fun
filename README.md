# tampermonkey-fun
Experiment and Useful Grease/TamperMonkey Scripts.

# tampermonkey-fun
Experiment and Useful Grease/TamperMonkey Scripts.

## Debug
For debugging, use the experiment script. The main file for experiments is [`src/core/experiment.ts`](src/core/experiment.ts:1).
To get started with a debug environment, run:
-   Add Call to EntryPoint Function in `src/core/experiment.ts`.
-   `make setup` (Build Project and start Live Reload)
-   Load Debug Script with Updated Header in Tamper Monkey. `dist/index.dev.user.js`

To load the debug version of the script in Tampermonkey, ensure your userscript metadata includes:
```javascript
// @require     file:///home/aman/Projects/tampermonkey-fun/dist/index.debug.js
```

## Production Builds
Build Steps:
- Uncomment entry point in Core file. Eg `src/core/imdb.ts` uncomment `RunImdb();`
- Build Target using Make File. Eg. `make imdb`, `make picasso`, etc.
- Copy output of `dist/index.prod.user.js` to your Tampermonkey userscript manager.

*Note: Don't checkin the modified entry point file.*

## NPM Commands
Key `npm` commands for project and dependency management:
- `npm init`: Initialize a new npm package (if starting from scratch).
- `npm install` (or `npm i`): Install project dependencies from `package.json`.
- `npm update` (or `npm up`): Update project dependencies to their latest versions based on `package.json`.
- `npm list` (or `npm ls`): List installed packages.
- `npm search <term>`: Search the npm registry for packages.
- `npm outdated`: Check for outdated dependencies.
- `npm run <script>`: Execute a script defined in `package.json` (e.g., `npm run test`).
- `npm version <major|minor|patch>`: Bump package version.


#### Resources
- [Local Setup](https://stackoverflow.com/questions/41212558/develop-tampermonkey-scripts-in-a-real-ide-with-automatic-deployment-to-openuser)
- [Webpack](https://github.com/trim21/webpack-userscript-template?tab=readme-ov-file)