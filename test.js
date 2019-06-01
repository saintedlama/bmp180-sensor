const bmp180 = require('./')

 bmp180({
    address: 0x77,
    mode: 1,
})
.then(sensor => sensor.read())
.then(data => console.log(data))
.catch(err => console.error(err))
