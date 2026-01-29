const Sensor = require("./lib/sensor");

module.exports = async function (options) {
  options = options || {};
  options.bus = options.bus || 1;
  options.mode = options.mode || 1;
  options.address = options.address || 0x77;

  // Allow dependency injection for testing, lazy-load i2c-bus only when needed
  let i2cOpen;
  if (options.i2cBus) {
    i2cOpen = options.i2cBus;
  } else {
    const i2c = require("i2c-bus");
    i2cOpen = i2c.openSync(options.bus);
  }

  const sensor = new Sensor(i2cOpen, options);
  await sensor.calibrate();

  return sensor;
};
