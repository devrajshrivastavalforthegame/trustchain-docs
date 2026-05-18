const detectTampering = (file) => {
  let flags = [];

  if (file.size > 10000000) {
    flags.push("Large file size anomaly");
  }

  if (!file.mimetype.includes("pdf") && !file.mimetype.includes("presentation")) {
    flags.push("Unexpected document type");
  }

  return {
    tampered: flags.length > 0,
    flags,
  };
};

module.exports = detectTampering;