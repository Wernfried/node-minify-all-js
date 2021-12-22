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

const minifyJS = async file => {
  total_files ++
  try {
    await minify({
      compressor: terser,
      input: file,
      output: file,
      options: {
        module: options.module,
        mangle: options.mangle,
        compress: true
      }
    })
  } catch(e) {
    failed_files.push(file)
  }
  process.stdout.write('.')
}

const minifyJSON = async file => {
  try {
    if ((options.compress_json || options.packagejson)) {
      total_files ++
      var is_package_json = file.indexOf('package.json') > -1
      var data = await readFile(file, 'utf8')
      var json = JSON.parse(data)
      var new_json = {}
      if (options.packagejson && is_package_json) {
        var {
          name, version, bin, main, binary, engines
        } = json
        new_json = {name, version}
        if (bin) new_json.bin = bin
        if (binary) new_json.binary = binary
        if (main) new_json.main = main
        if (engines) new_json.engines = engines
      } else {
        new_json = json
      }
      await writeFile(file, JSON.stringify(new_json))
    }
  } catch(e) {}
  process.stdout.write('.')
}

const walk = async (currentDirPath) => {
  var js_files = []
  var json_files = []
  var dirs = []
  var current_dirs = await readdir(currentDirPath)
  current_dirs.forEach(name => {
    var filePath = path.join(currentDirPath, name);
    var stat = fs.statSync(filePath);
    var is_bin = /\.bin$/
    if (stat.isFile()) {
      if (filePath.substr(-5) === ".json")
        json_files.push(filePath)
      else if (filePath.substr(-3) === ".js" || options.all_js)
        js_files.push(filePath)
    } else if (stat.isDirectory() && !is_bin.test(filePath)) {
      dirs.push(filePath)
    }
  })
  var js_promise = Promise.all(js_files.map(f => minifyJS(f)))
  var json_promise = Promise.all(json_files.map(f => minifyJSON(f)))
  await Promise.all([js_promise, json_promise])
  await promiseSeries(dirs.map(dir => () => walk(dir)))
}

async function minifyAll (dir, opts){
  Object.assign(options, opts || {})
  console.log('minify-all-js options:\n', JSON.stringify(options, null, 2))
  await walk(dir);
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
  var opts = {}

  opts.compress_json = input.includes('--json') || input.includes('-j') || false
  opts.module = input.includes('--module') || input.includes('-m') || false
  opts.mangle = input.includes('--mangle') || input.includes('-M') || false
  opts.packagejson = input.includes('--packagejson') || input.includes('-p') || false
  opts.all_js = input.includes('--all') || input.includes('-a') || false

  minifyAll(inputDir, opts);

} else {
  module.exports = minifyAll;
}
