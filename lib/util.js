module.exports = {
    toS16(high, low) {
        if (high > 127) {
          high -= 256;
        }

        return (high << 8) + low;
      },

      toU16(high, low) {
        return (high << 8) + low;
      },

      waitAsync(ms) {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve()
          }, ms);
        })
      }
}