class I2cAsyncConnection {
    constructor(connection, address) {
        this.connection = connection
        this.address = address
    }

    readI2cBlock(cmd , length) {
        return new Promise((resolve, reject) => {
            this.connection.readI2cBlock(this.address, cmd , length, Buffer.alloc(length), function (err, bytesRead, data) {
                if (err) {
                  return reject(err)
                }

                if (bytesRead != length) {
                  return reject(new Error(`Expected to read ${length} bytes from bmp180 but received ${bytesRead}`))
                }

                resolve(data)
            })
        })
    }

    writeByte(cmd, byte) {
        return new Promise((resolve, reject) => {
            this.connection.writeByte(this.address, cmd, byte, (err) => err?reject(err):resolve())
        })
    }

    close() {
      return new Promise((resolve, reject) => this.connection.close(err => err?reject(err):resolve()))
    }
}

module.exports = I2cAsyncConnection
