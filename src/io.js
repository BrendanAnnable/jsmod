const path = require('path');
const Promise = require('bluebird');
const recast = require('recast');
const types = require('ast-types');
const mkdirp = Promise.promisify(require('mkdirp'));
const glob = Promise.promisify(require('glob'));
const fs = Promise.promisifyAll(require('fs'));
const jsmod = require('./jsmod').jsmod;

const def = types.Type.def;
const build = types.builders;

def('Project')
  .bases('Node')
  .build('files')
  .field('files', [def('File')], () => []);

types.finalize();

/**
 * @param {!Array<string>} filePatterns An array of glob compatible file patterns.
 * @param {!Object} options Parsing options to pass to recast.
 * @returns {!P<!JSMod>} A promise to a JSMod project instance.
 */
function load(filePatterns, options) {
  return Promise.all(filePatterns.map(filePattern => glob(filePattern)))
    .then(filePathsList => [].concat(...filePathsList))
    .then(filePaths => Promise.all(parseFiles(filePaths, options)))
    .then(files => jsmod(build.project(files)));
}

/**
 * @param {!JSMod} project A post-transform JSMod project instance.
 * @param {!JSMod} original A pre-transform JSMod project instance.
 * @param {!Object} options Printing options to pass to recast.
 * @returns {!P} A promise that is resolved when all files are written to disk.
 */
function save(project, original, options) {
  return Promise.all(project.getAst().files
    // Filter by those which have changed.
      .filter((file, index) => file !== original.getAst().files[index])
      .map(file => {
        return ensureDirectoryExists(file.name)
          .then(() => renameMaybe(file))
          .then(() => {
            const source = toSource(file, options);
            return writeToDisk(file.name, source);
          });
      })
  );
}

/**
 * @param {!Array<string>} filePaths An array of file paths.
 * @param {!Object} options Parsing options to pass to recast.
 * @returns {!P<!Array<!Element>>} A promise that is resolved once all files have been parsed.
 */
function parseFiles(filePaths, options = {}) {
  return filePaths.map(filePath => fs.readFileAsync(filePath, 'utf8')
    .then(code => parseFile(code, filePath, options)));
}

/**
 * @param {string} code The source code to parse.
 * @param {string} filePath The file path of the file.
 * @param {!Object} options Parsing options to pass to recast.
 * @returns {!Element} An AST.
 */
function parseFile(code, filePath, options) {
  try {
    const sourceFileName = getRelativeFilePath(filePath, options.baseDir);
    return recast.parse(code, Object.assign({ sourceFileName }, options));
  } catch (err) {
    throw new Error(`Could not parse file ${filePath}\n${err}`);
  }
}

/**
 * @param {string} filePath A file path to make relative.
 * @param {string=} baseDir An optional base path.
 * @returns {string} The relative file path.
 */
function getRelativeFilePath(filePath, baseDir) {
  return baseDir == null ? filePath : path.relative(baseDir, filePath);
}

/**
 * @param {{
 *   original: {
 *     name: string
 *   },
 *   name: string
 * }} file A File element to rename if different from original.
 * @returns {!P} A promise that is resolved once the file is renamed.
 */
function renameMaybe(file) {
  if (file.original && file.name !== file.original.name) {
    return fs.renameAsync(file.original.name, file.name);
  }
  return Promise.resolve();
}

/**
 * @param {string} file The File ast node.
 * @param {!Object} options Parsing options to pass to recast.
 * @returns {string} The source code of the file.
 */
function toSource(file, options) {
  return recast.print(file, options).code;
}

/**
 * @param {string} fileName The file name to write to.
 * @param {string} source The source code to write.
 * @returns {!P} A promise that is resolved once the file is written.
 */
function writeToDisk(fileName, source) {
  return fs.writeFileAsync(fileName, source);
}

/**
 * @param {string} filePath A file path to ensure that a directory exists for.
 * @returns {!P} A promise that is resolved once any needed directories are created.
 */
function ensureDirectoryExists(filePath) {
  return mkdirp(path.dirname(filePath));
}

module.exports = { load, save };
