const debug = require('debug')('bmp180-sensor')
const { toS16, toU16, waitAsync } = require('./util')
const I2cAsyncConnection = require('./i2c-connection-async')

const BMP180_CONTROL_REGISTER  = 0xF4;
const BMP180_SELECT_TEMP       = 0x2E;
const BMP180_SELECT_PRESSURE   = 0x34;
const BMP180_CONVERSION_RESULT = 0xF6;
const BMP180_XLSB              = 0xF7;

class Sensor {
    constructor(i2cConnection, options) {
      this.i2cConnection = new I2cAsyncConnection(i2cConnection, options.address)

      this.options = options
      this.cal = {}
    }

    async calibrate() {
      const data = await this.i2cConnection.readI2cBlock(0xAA, 22)

      const cal = {
        ac1: toS16(data[0], data[1]),
        ac2: toS16(data[2], data[3]),
        ac3: toS16(data[4], data[5]),
        ac4: toU16(data[6], data[7]),
        ac5: toU16(data[8], data[9]),
        ac6: toU16(data[10], data[11]),
        b1:  toS16(data[12], data[13]),
        b2:  toS16(data[14], data[15]),
        mb:  toS16(data[16], data[17]),
        mc:  toS16(data[18], data[19]),
        md:  toS16(data[20], data[21])
      };

      debug('BMP-180 calibration values received', cal)

      this.cal = cal

      return cal
    }

    async read() {
      return {
        pressure: await this.readPressure(),
        temperature: await this.readTemperature(),
      }
    }

    async readPressure() {
      const up = await this.readPressureRaw()
      const ut = await this.readTemperatureRaw()

      /* Temperature compensation */
      const b5 = this.computeB5(ut);

      /* Pressure compensation */
      const b6 = b5 - 4000;
      let x1 = (this.cal.b2 * ((b6 * b6) >> 12)) >> 11;
      let x2 = (this.cal.ac2 * b6) >> 11;
      let x3 = x1 + x2;

      const b3 = ((((this.cal.ac1) * 4 + x3) << this.options.mode) + 2) >> 2;

      x1 = (this.cal.ac3 * b6) >> 13;
      x2 = (this.cal.b1 * ((b6 * b6) >> 12)) >> 16;
      x3 = ((x1 + x2) + 2) >> 2;
      const b4 = (this.cal.ac4 * (x3 + 32768)) >> 15;
      const b7 = ((up - b3) * (50000 >> this.options.mode));

      debug('b5', b5)
      debug('b6', b6)
      debug('b3', b3)
      debug('b4', b4)
      debug('b7', b7);

      let p

      if (b7 < 0x80000000)
      {
        p = (b7 * 2) / b4;
      }
      else
      {
        p = (b7 / b4) * 2;
      }

      x1 = (p >> 8) * (p >> 8);
      x1 = (x1 * 3038) >> 16;
      x2 = (-7357 * p) >> 16;
      const pressure = p + ((x1 + x2 + 3791) >> 4);

      debug(`Pressure ${pressure} Pa`)

      return pressure;
    }

    async readPressureRaw() {
      // Write select pressure command to control register
      await this.i2cConnection.writeByte(BMP180_CONTROL_REGISTER, BMP180_SELECT_PRESSURE + (this.options.mode << 6))
      await waitAsync(26)

      const data = await this.i2cConnection.readI2cBlock(BMP180_CONVERSION_RESULT, 3)

      return ((data[0] << 16) + (data[1] << 8) + data[2]) >> (8 - this.options.mode)
    }

    async readTemperature() {
      const ut = await this.readTemperatureRaw()

      const b5 = this.computeB5(ut);
      const t = (b5 + 8) >> 4;

      return t / 10;
    }

    async readTemperatureRaw() {
      // Write select temperature command to control register
      await this.i2cConnection.writeByte(BMP180_CONTROL_REGISTER, BMP180_SELECT_TEMP)
      await waitAsync(5)

      const data = await this.i2cConnection.readI2cBlock(BMP180_CONVERSION_RESULT, 2)

      return  (data[0] << 8) + data[1]
    }

    async close() {
      await this.i2cConnection.close()
    }

    computeB5(ut) {
      const x1 = (ut - this.cal.ac6) * this.cal.ac5 >> 15;
      const x2 = (this.cal.mc << 11) / (x1 + this.cal.md);
      return x1 + x2;
    }
  }

  module.exports = Sensor
