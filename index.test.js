const { describe, it, beforeEach } = require('node:test')
const assert = require('node:assert')
const bmp180 = require('./index')

// Mock i2c-bus connection
function createMockI2cBus() {
  // Example calibration data from BMP180 datasheet
  const calibrationData = Buffer.from([
    0x00, 0xC8, // AC1 = 408
    0xFC, 0x7E, // AC2 = -898
    0xC0, 0x44, // AC3 = -16316
    0x79, 0xD7, // AC4 = 31191
    0x61, 0x42, // AC5 = 24898
    0x55, 0x7E, // AC6 = 21886
    0x18, 0x43, // B1 = 6211
    0x00, 0x04, // B2 = 4
    0x80, 0x00, // MB = -32768
    0xE7, 0xC0, // MC = -6208
    0x0A, 0x44  // MD = 2628
  ])

  // Example from datasheet: UT = 27898, UP = 23843
  const temperatureData = Buffer.from([0x6C, 0xFA]) // 27898
  const pressureData = Buffer.from([0x5D, 0x23, 0x00]) // Will be shifted based on mode

  return {
    readI2cBlock: (address, cmd, length, buffer, callback) => {
      let data
      
      if (cmd === 0xAA && length === 22) {
        // Calibration read
        data = calibrationData
      } else if (cmd === 0xF6 && length === 2) {
        // Temperature read
        data = temperatureData
      } else if (cmd === 0xF6 && length === 3) {
        // Pressure read
        data = pressureData
      } else {
        return callback(new Error('Unexpected read'))
      }

      data.copy(buffer)
      callback(null, length, buffer)
    },
    writeByte: (address, cmd, byte, callback) => {
      // Mock successful write
      setImmediate(callback)
    },
    close: (callback) => {
      setImmediate(callback)
    }
  }
}

describe('bmp180-sensor', () => {
  describe('initialization', () => {
    it('should initialize with default options', async () => {
      const mockBus = createMockI2cBus()
      const sensor = await bmp180({ i2cBus: mockBus })
      
      assert.ok(sensor)
      assert.strictEqual(typeof sensor.read, 'function')
      assert.strictEqual(typeof sensor.readTemperature, 'function')
      assert.strictEqual(typeof sensor.readPressure, 'function')
      assert.strictEqual(typeof sensor.close, 'function')
    })

    it('should use provided options', async () => {
      const mockBus = createMockI2cBus()
      const sensor = await bmp180({ 
        i2cBus: mockBus,
        address: 0x77,
        mode: 3
      })
      
      assert.ok(sensor)
      assert.strictEqual(sensor.options.address, 0x77)
      assert.strictEqual(sensor.options.mode, 3)
    })

    it('should calibrate on initialization', async () => {
      const mockBus = createMockI2cBus()
      const sensor = await bmp180({ i2cBus: mockBus })
      
      // Check that calibration values were loaded
      assert.ok(sensor.cal)
      assert.strictEqual(typeof sensor.cal.ac1, 'number')
      assert.strictEqual(typeof sensor.cal.ac2, 'number')
      assert.strictEqual(typeof sensor.cal.ac3, 'number')
      assert.strictEqual(typeof sensor.cal.ac4, 'number')
      assert.strictEqual(typeof sensor.cal.ac5, 'number')
      assert.strictEqual(typeof sensor.cal.ac6, 'number')
      assert.strictEqual(typeof sensor.cal.b1, 'number')
      assert.strictEqual(typeof sensor.cal.b2, 'number')
    })
  })

  describe('read operations', () => {
    it('should read temperature', async () => {
      const mockBus = createMockI2cBus()
      const sensor = await bmp180({ i2cBus: mockBus })
      
      const temperature = await sensor.readTemperature()
      
      assert.strictEqual(typeof temperature, 'number')
      assert.ok(temperature > -50 && temperature < 100, 'Temperature should be in reasonable range')
    })

    it('should read pressure', async () => {
      const mockBus = createMockI2cBus()
      const sensor = await bmp180({ i2cBus: mockBus })
      
      const pressure = await sensor.readPressure()
      
      assert.strictEqual(typeof pressure, 'number')
      assert.ok(!isNaN(pressure), 'Pressure should be a valid number')
      assert.ok(pressure > 0, 'Pressure should be positive')
    })

    it('should read both temperature and pressure', async () => {
      const mockBus = createMockI2cBus()
      const sensor = await bmp180({ i2cBus: mockBus })
      
      const data = await sensor.read()
      
      assert.ok(data)
      assert.strictEqual(typeof data.temperature, 'number')
      assert.strictEqual(typeof data.pressure, 'number')
      assert.ok(!isNaN(data.temperature), 'Temperature should be a valid number')
      assert.ok(!isNaN(data.pressure), 'Pressure should be a valid number')
      assert.ok(data.temperature > -50 && data.temperature < 100)
      assert.ok(data.pressure > 0, 'Pressure should be positive')
    })
  })

  describe('different modes', () => {
    it('should work with mode 0 (ultra low power)', async () => {
      const mockBus = createMockI2cBus()
      const sensor = await bmp180({ i2cBus: mockBus, mode: 0 })
      
      const data = await sensor.read()
      
      assert.ok(data.temperature)
      assert.ok(data.pressure)
    })

    it('should work with mode 1 (standard)', async () => {
      const mockBus = createMockI2cBus()
      const sensor = await bmp180({ i2cBus: mockBus, mode: 1 })
      
      const data = await sensor.read()
      
      assert.ok(data.temperature)
      assert.ok(data.pressure)
    })

    it('should work with mode 2 (high resolution)', async () => {
      const mockBus = createMockI2cBus()
      const sensor = await bmp180({ i2cBus: mockBus, mode: 2 })
      
      const data = await sensor.read()
      
      assert.ok(data.temperature)
      assert.ok(data.pressure)
    })

    it('should work with mode 3 (ultra high resolution)', async () => {
      const mockBus = createMockI2cBus()
      const sensor = await bmp180({ i2cBus: mockBus, mode: 3 })
      
      const data = await sensor.read()
      
      assert.ok(data.temperature)
      assert.ok(data.pressure)
    })
  })

  describe('error handling', () => {
    it('should handle read errors gracefully', async () => {
      const errorBus = {
        readI2cBlock: (address, cmd, length, buffer, callback) => {
          callback(new Error('I2C read error'))
        },
        writeByte: (address, cmd, byte, callback) => {
          setImmediate(callback)
        },
        close: (callback) => {
          setImmediate(callback)
        }
      }

      await assert.rejects(
        async () => await bmp180({ i2cBus: errorBus }),
        /I2C read error/
      )
    })

    it('should handle incorrect byte count', async () => {
      const errorBus = {
        readI2cBlock: (address, cmd, length, buffer, callback) => {
          callback(null, length - 1, buffer) // Return incorrect byte count
        },
        writeByte: (address, cmd, byte, callback) => {
          setImmediate(callback)
        },
        close: (callback) => {
          setImmediate(callback)
        }
      }

      await assert.rejects(
        async () => await bmp180({ i2cBus: errorBus }),
        /Expected to read/
      )
    })

    it('should handle write errors', async () => {
      const mockBus = createMockI2cBus()
      const sensor = await bmp180({ i2cBus: mockBus })
      
      // Replace writeByte with error version
      sensor.i2cConnection.connection.writeByte = (address, cmd, byte, callback) => {
        callback(new Error('I2C write error'))
      }

      await assert.rejects(
        async () => await sensor.readTemperature(),
        /I2C write error/
      )
    })
  })

  describe('close operation', () => {
    it('should close the connection', async () => {
      let closed = false
      const mockBus = createMockI2cBus()
      mockBus.close = (callback) => {
        closed = true
        setImmediate(callback)
      }

      const sensor = await bmp180({ i2cBus: mockBus })
      await sensor.close()
      
      assert.strictEqual(closed, true)
    })
  })
})
