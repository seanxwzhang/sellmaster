const {winston, redisClient} = require("./globals.js");

redisClient.zaddAsync("testindex", 0, "09-17 Bmw K1300s Oem Swingarm Pivot Pins:10012241550")
.then((res) => {
  console.log(res);
});

redisClient.zrangebylexAsync("testindex", "[", "+")
.then((res) => {
  console.log(res);
});
