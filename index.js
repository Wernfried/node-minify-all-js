#!/usr/bin/env node

const fs = require("fs");
const { promisify } = require('util')
const path = require("path");
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const readdir = promisify(fs.readdir)
const promiseSeries = require('promise.series')
const minify = require('@node-minify/core');
const terser = require('@node-minify/terser');

var failed_files = []
var total_files = 0
var options = {}

const minifyJS = async (inFile, outFile) => {
  total_files++
  //console.log(`${inFile} -> ${outFile}`);
  try {
    await minify({
      compressor: terser,
      input: inFile,
      output: outFile,
      options: {
        module: options.module,
        mangle: options.mangle,
        compress: { reduce_vars: false }
      }
    })
  } catch (e) {
    failed_files.push(inFile)
  }
  process.stdout.write('.')
}

const minifyJSON = async (inFile, outFile) => {
  try {
    if ((options.compress_json || options.packagejson)) {
      total_files++
      var is_package_json = inFile.endsWith('package.json');
      var data = await readFile(inFile, 'utf8')
      var json = JSON.parse(data)
      var new_json = {}
      if (options.packagejson && is_package_json) {
        var {
          name, version, bin, main, binary, engines
        } = json
        new_json = { name, version }
        if (bin) new_json.bin = bin
        if (binary) new_json.binary = binary
        if (main) new_json.main = main
        if (engines) new_json.engines = engines
        await writeFile(outFile, JSON.stringify(new_json))
      }
    }
  } catch (e) { }
  process.stdout.write('.')
}

const walk = async (inputDir, outputDir, overwrite) => {
  var js_files = []
  var json_files = []
  var dirs = []
  var current_dirs = await readdir(inputDir)
  current_dirs.forEach(name => {
    var filePath = path.join(inputDir, name);
    var stat = fs.statSync(filePath);
    var outFile = path.join(outputDir, overwrite ? name : `${path.basename(name, path.extname(name))}.min${path.extname(name)}`);
    if (!overwrite && path.basename(name, path.extname(name)).endsWith(".min"))
      outFile = path.join(outputDir, name);
    if (stat.isFile()) {
      if (filePath.endsWith(".json"))
        json_files.push({ in: filePath, out: outFile })
      else if (filePath.endsWith(".js") || options.all_js)
        js_files.push({ in: filePath, out: outFile })
    } else if (overwrite && stat.isDirectory() && !filePath.endsWith(".bin")) {
      dirs.push(filePath)
    }
  })
  var js_promise = Promise.all(js_files.map(f => minifyJS(f.in, f.out)))
  var json_promise = Promise.all(json_files.map(f => minifyJSON(f.in, f.out)))
  await Promise.all([js_promise, json_promise])
  if (overwrite)
    await promiseSeries(dirs.map(dir => () => walk(dir, dir, overwrite)))
}

async function minifyAll(inputDir, outputDir, opts, overwrite) {
  Object.assign(options, opts || {})
  console.log('minify-all-js options:\n', JSON.stringify(options, null, 2))
  await walk(inputDir, outputDir, overwrite);
  process.stdout.write('.\n')
  console.log('Total found files: ' + total_files)
  if (failed_files.length) {
    console.log(`\n\nFailed to minify files:`)
    failed_files.forEach(f => console.log('\t' + f))
  }
};

if (require.main === module) {
  var input = process.argv;
  var inputDir = input[2] || process.cwd();
  if (inputDir.startsWith("-"))
    inputDir = process.cwd();

  var outputDir = input[3] || inputDir;
  if (outputDir.startsWith("-"))
    outputDir = inputDir;

  var opts = {}
  opts.compress_json = input.includes('--json') || input.includes('-j') || false
  opts.module = input.includes('--module') || input.includes('-m') || false
  opts.mangle = input.includes('--mangle') || input.includes('-M') || false
  opts.packagejson = input.includes('--packagejson') || input.includes('-p') || false
  opts.all_js = input.includes('--all') || input.includes('-a') || false

  var overwrite = input.includes('--overwrite') || input.includes('-o') || false;
  if (overwrite)
    outputDir = inputDir;

  minifyAll(inputDir, outputDir, opts, overwrite);

} else {
  module.exports = minifyAll;
}
