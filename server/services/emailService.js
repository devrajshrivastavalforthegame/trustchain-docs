const nodemailer =
  require("nodemailer");

const transporter =
  nodemailer.createTransport({

    service: "gmail",

    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },

});

const sendDegreeIssuedEmail =
  async (
    toEmail,
    studentName
  ) => {

    try {

      await transporter.sendMail({

        from: process.env.EMAIL_USER,

        to: toEmail,

        subject:
          "Degree Uploaded Successfully",

        html: `
          <h2>TrustChain Docs</h2>

          <p>
            Hello ${studentName},
          </p>

          <p>
            Your academic degree
            has been uploaded
            successfully on
            TrustChain Docs.
          </p>

          <p>
            Your document is now
            secured using blockchain
            verification.
          </p>

          <h3>
            Thank you
          </h3>
        `,
      });

      console.log(
        "Email sent successfully"
      );

    } catch (error) {

      console.log(
        "Email Error:",
        error
      );

    }

};

module.exports = {
  sendDegreeIssuedEmail,
};