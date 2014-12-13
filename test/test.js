
var assert = require('assert')
var fs = require('fs')

var Cache = require('..')

var cache = new Cache({
  interval: 10
})

it('.set() a value', function () {
  return cache.set('a', 'asdf')
})

it('.get() the same value', function () {
  return cache.get('a').then(function (value) {
    assert.equal('asdf', value.toString())
  })
})

it('.access() should be true if it exists', function () {
  return cache.access('a').then(function (value) {
    assert(value)
  })
})

it('.access() should be false if it does not exist', function () {
  return cache.access('asdf').then(function (value) {
    assert(!value)
  })
})

it('.copy() should copy a file', function () {
  return cache.copy('abc', __filename).then(function () {
    return cache.get('abc')
  }).then(function (buf) {
    assert(~buf.toString().indexOf('lkajsdlfkjasdf'))
  })
})

it('.move() should move a file', function () {
  fs.writeFileSync('ex.js', 'asdf')
  return cache.move('arb', 'ex.js').then(function () {
    return cache.get('arb')
  }).then(function (value) {
    assert.equal('asdf', value.toString())
  })
})

it('.defineGetter() and .defineSetter() should set custom accessors', function () {
  cache.defineGetter(function (value) {
    return JSON.parse(value.toString())
  })

  cache.defineSetter(JSON.stringify)

  return cache.set('123', {
    message: 'lol'
  }).then(function () {
    return cache.get('123')
  }).then(function (value) {
    assert.deepEqual(value, {
      message: 'lol'
    })
  })
})

it('.clear(_id) should clear the key', function () {
  return cache.clear('123').then(function () {
    return cache.get('123')
  }).then(function (value) {
    assert(value == null)
  })
})

it('.clear() should clear everything', function () {
  return cache.clear().then(function () {
    return cache.get('abc')
  }).then(function (value) {
    assert(value == null)
  })
})
