# minify-all-js

A function that minifies your javascript files (recursively when `--overwrite`).
**minify-all-js** was designed to reduce the size of your js files. By giving it a directory and option `--overwrite`, `minify-all-js` will walk through the depth of your folders and minify all the javascript that it sees.

Without `--overwrite` (the default), `minify-all-js` does not scan directories recursively and files are renamed to "<old name>.min.js". If such a file already exists, then it is overwritten. This prevents to get files like "<old name>.min.min.min.js" if you run `minify-all-js` multiple times.

### Installation

    > npm install -g minify-all-js

### Run CLI

    > minify-all-js [inputFolder] [outputFolder] [-j] [-m] [-M] [-p] [-o]

##### Sample

    > minify-all-js ./node_modules -j -m -M -p

Use CLI options:
 - `inputFolder` folder of input files or current directory if undefined
 - `outputFolder` folder for output files or `inputFolder` if undefined
 - `-j` or `--json` to compress json files as well. (default: `false`)
 - `-m` or `--module` to set terser module option to `true` for ES6 files (default: `false`)
 - `-M` or `--mangle` to set terser mangle option to `true` (default: `false`)
 - `-p` or `--packagejson` to clean up extra fields from package.json and files (default: `false`)
 - `-a` or `--all` to try to compress all files including binary/executable js files without `.js` extension (default: `false`)
 - `-o` or `--overwrite` to overwrite original files. If `true` then `outputFolder` is ignored (default: `false`)


### Run programatically

```js
  var promise = minifyAllJs([directory], {
    compress_json: true, // -j in cli
    module: true,        // -m in cli
    mangle: true,        // -M in cli
    packagejson: true,   // -p in cli
    all_js: true         // -a in cli
  })
```

`minifyAllJs` function returns a **promise**
