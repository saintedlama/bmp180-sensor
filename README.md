# BMP180-sensor

An Node.js module to interface a BMP085 and BMP180 temperature and pressure sensor with the Raspberry Pi

## Installation

```bash
npm i bmp180-sensor
```

## Usage

```js
const bmp180 = require('bmp180-sensor')

 bmp180({
    address: 0x77,
    mode: 1,
})
.then(sensor => sensor.read())
.then(data => console.log(data))
.catch(err => console.error(err))
```
