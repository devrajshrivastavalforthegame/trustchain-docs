const crypto = require("crypto");
const fs = require("fs");

const generateFileHash = (filePath) => {
  return new Promise((resolve, reject) => {

    const hash =
      crypto.createHash("sha256");

    const stream =
      fs.createReadStream(filePath);

    stream.on("data", (data) => {
      hash.update(data);
    });

    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });

    stream.on("error", (error) => {
      reject(error);
    });

  });
};

module.exports = generateFileHash;