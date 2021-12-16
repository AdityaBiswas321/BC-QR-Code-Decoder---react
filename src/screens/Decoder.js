import React from "react";

import { BrowserQRCodeReader } from "@zxing/library";
import {
  getQRFromImage,
  getScannedJWS,
  verifyJWS,
  decodeJWS,
  decodeJWSPayload,
} from "../functions/shc";

//   ------------------

const Decoder = () => {
  // -----------------
  let verifySig;
  function setResult(result) {
    document.getElementById("result").textContent = result;
    codeReader.reset();
  }

  function setPayload(payload, verified) {
    setResult(
      (verified ? "verified issuer: " : "issuer (UNVERIFIED): ") +
        payload.iss +
        "\n" +
        JSON.stringify(payload.vc.credentialSubject.fhirBundle.entry, null, 2)
    );
  }

  function decodeOnce(codeReader, selectedDeviceId, verifySig) {
    codeReader
      .decodeFromInputVideoDevice(selectedDeviceId, "video")
      .then((result) => {
        console.log("SHC string", result.text);
        const scannedJWS = getScannedJWS(result.text);
        console.log("scannedJWS", scannedJWS);
        decodeJWS(scannedJWS)
          .then(function (decoded) {
            console.log("decodedJWS", decoded);
            if (!verifySig) {
              setPayload(decoded, false);
              return;
            }
            return verifyJWS(scannedJWS, decoded.iss).then(
              (result) =>
                decodeJWSPayload(result.payload).then((result) =>
                  setPayload(result, true)
                ),
              (error) => {
                if (error.customMessage) {
                  setResult(error.message);
                } else {
                  console.error(error);
                  setResult(
                    "Fake vaccine record?\n" +
                      "Signature verification failed for issuer " +
                      decoded.iss
                  );
                }
              }
            );
          })
          .catch((e) => {
            console.error(e);
            setResult("This doesn't look like a SMART health card");
          });
      })
      .catch((err) => {
        if (err.cause) {
          console.error(err.cause);
          setResult("This doesn't look like a SMART health card");
        } else {
          console.error(err);
          setResult(err);
        }
      });
  }

  let selectedDeviceId;
  const codeReader = new BrowserQRCodeReader();
  console.log("ZXing code reader initialized");

  codeReader
    .getVideoInputDevices()
    .then((videoInputDevices) => {
      const sourceSelect = document.getElementById("sourceSelect");
      selectedDeviceId = videoInputDevices[0].deviceId;
      verifySig = true;
      if (videoInputDevices.length >= 1) {
        videoInputDevices.forEach((element) => {
          const sourceOption = document.createElement("option");
          sourceOption.text = element.label;
          sourceOption.value = element.deviceId;
          sourceSelect.appendChild(sourceOption);
        });

        sourceSelect.onchange = () => {
          selectedDeviceId = sourceSelect.value;
        };

        const sourceSelectPanel = document.getElementById("sourceSelectPanel");
        sourceSelectPanel.style.display = "block";
      }

      document.getElementById("startButton").addEventListener("click", () => {
        decodeOnce(codeReader, selectedDeviceId, verifySig);
        console.log(`Started decode from camera with id ${selectedDeviceId}`);
      });

      document.getElementById("resetButton").addEventListener("click", () => {
        codeReader.reset();
        setResult("");
        console.log("Reset.");
      });

      const verifyCheckbox = document.getElementById("verifyCheckbox");
      verifyCheckbox.onchange = () => {
        verifySig = verifyCheckbox.checked;
      };
    })
    .catch((err) => {
      console.error(err);
    });

  // -----------------

  return (
    <body class="antialiased">
      <noscript>You need to enable JavaScript to run this app.</noscript>

      <div id="root"></div>

      <div>
        <button id="startButton">Start</button>
        <button id="resetButton">Reset</button>
      </div>

      <div>
        <video
          id="video"
          width="300"
          height="200"
          style={{ border: "1px solid gray", transform: "scaleX(-1)" }}
        ></video>
      </div>
      <div id="sourceSelectPanel" style={{ display: "none" }}>
        <label for="sourceSelect">Change video source:</label>
        <select id="sourceSelect" style={{ maxWidth: "400px" }}></select>
      </div>
      <div id="verifyPanel">
        <input type="checkbox" id="verifyCheckbox" checked="true"></input>
        <label for="verifyCheckbox">Verify signature</label>
      </div>

      <label>Result:</label>
      <pre>
        <code id="result"></code>
      </pre>
    </body>
  );
};

export default Decoder;
