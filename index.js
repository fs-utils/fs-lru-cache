
var Promise = require('native-or-bluebird')
var exec = require('child_process').exec
var mkdirpSync = require('mkdirp').sync
var mkdirp = require('mkdirp-then')
var rimraf = require('rimraf-then')
var path = require('path')
var fs = require('mz/fs')
var cp = require('fs-cp')
var ms = require('ms')

var tmpdir = require('os').tmpdir()

module.exports = Cache

function Cache(name, options) {
  if (!(this instanceof Cache)) return new Cache(name, options)

  options = options || {}
  if (typeof name === 'object') {
    options = name
    name = null
  }

  var folder = this.tmpdir = path.join(tmpdir, 'fs-lru-cache', name || random())
  mkdirpSync(folder)

  var maxage = options.maxage || options.maxAge || '30m'
  if (typeof maxage === 'string') maxage = ms(maxage)
  this.maxage = maxage
  var interval = options.interval || '30m'
  if (typeof interval === 'string') interval = ms(interval)
  this.interval = interval

  var self = this
  this.interval_id = setInterval(function () {
    self.reap()
  }, interval)
  self.reap()
}

/**
 * Define custom serializing and deserializing functions.
 */

Cache.prototype._get = identity
Cache.prototype._set = identity

Cache.prototype.defineGetter = function (fn) {
  this._get = fn
}

Cache.prototype.defineSetter = function (fn) {
  this._set = fn
}

/**
 * Delete all old data.
 */

Cache.prototype.reap = function () {
  exec('find "' + this.tmpdir
    + '" -mmin +' + Math.round(this.maxage / 1000 / 1000)
    + ' -type f -delete;', /* istanbul ignore next */ function (err) {
    if (!err) return
    if (~err.message.indexOf('No such file or directory')) return
    console.error(err.stack)
  })
}

/**
 * Get the filename of an _id.
 */

Cache.prototype.filename = function (_id) {
  return path.join(this.tmpdir, _id)
}

/**
 * Set a raw value.
 */

Cache.prototype.set = function (_id, value) {
  var filename = this.filename(_id)
  return Promise.resolve(this._set(value)).then(function (value) {
    return fs.writeFile(filename, value)
  }).then(function () {
    return filename
  })
}

/**
 * Get a raw value.
 */

Cache.prototype.get = function (_id) {
  var self = this
  var filename = this.filename(_id)
  return fs.readFile(filename).then(function (value) {
    update(filename)
    return self._get(value)
  }).catch(noop)
}

/**
 * Check whether the object exists.
 * If it does, update its atime.
 */

Cache.prototype.access = function (_id) {
  var filename = this.filename(_id)
  return fs.stat(filename).then(function () {
    update(filename)
    return filename
  }).catch(noop)
}

/**
 * Move a file to this _id.
 */

Cache.prototype.move = function (_id, source) {
  var filename = this.filename(_id)
  return fs.rename(path.resolve(source), filename).then(function () {
    return filename
  })
}

/**
 * Copy a file or a stream to this _id.
 */

Cache.prototype.copy = function (_id, source) {
  var filename = this.filename(_id)
  return cp(source, filename)
}

/**
 * Clear the entire cache or just a value.
 */

Cache.prototype.clear = function (_id) {
  if (!_id) {
    var tmpdir = this.tmpdir
    return rimraf(tmpdir).then(function () {
      return mkdirp(tmpdir)
    })
  }

  var filename = this.filename(_id)
  return fs.unlink(filename).catch(noop)
}

function update(filename) {
  var date = new Date()
  fs.utimes(filename, date, date).catch(noop)
}

function random() {
  return Math.random().toString(36).slice(2)
}

function identity(x) {
  return x
}

function noop() {}
