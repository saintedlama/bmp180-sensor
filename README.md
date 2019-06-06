# BMP180-sensor

An Node.js module to interface a BMP085 and BMP180 temperature and pressure sensor with the Raspberry Pi

## Installation

```bash
npm i bmp180-sensor
```

## Usage

```js
const bmp180 = require('bmp180-sensor')

async function readBmp180() {
    const sensor = await bmp180({
        address: 0x77,
        mode: 1,
    })

    const data = await sensor.read()

    console.log(data)

    await sensor.close()
}
```
