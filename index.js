const i2c = require('i2c-bus')
const Sensor = require('./lib/sensor')

module.exports = async function(options) {
  options = options || {}
  options.bus = options.bus || 1
  options.mode = options.mode || 1
  options.address = options.address || 0x77

  const i2cOpen = i2c.openSync(options.bus)

  const sensor = new Sensor(i2cOpen, options)
  await sensor.calibrate()

  return sensor
};