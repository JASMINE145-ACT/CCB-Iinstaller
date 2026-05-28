// @bun
import {
  __commonJS
} from "./chunk-qp2qdcda.js";

// node_modules/.bun/@aws-sdk+core@3.973.27/node_modules/@aws-sdk/core/dist-cjs/submodules/client/index.js
var require_client = __commonJS((exports) => {
  var state = {
    warningEmitted: false
  };
  var emitWarningIfUnsupportedVersion = (version) => {
    if (version && !state.warningEmitted && parseInt(version.substring(1, version.indexOf("."))) < 20) {
      state.warningEmitted = true;
      process.emitWarning(`NodeDeprecationWarning: The AWS SDK for JavaScript (v3) will
no longer support Node.js ${version} in January 2026.

To continue receiving updates to AWS services, bug fixes, and security
updates please upgrade to a supported Node.js LTS version.

More information can be found at: https://a.co/c895JFp`);
    }
  };
  var longPollMiddleware = () => (next, context) => async (args) => {
    context.__retryLongPoll = true;
    return next(args);
  };
  var longPollMiddlewareOptions = {
    name: "longPollMiddleware",
    tags: ["RETRY"],
    step: "initialize",
    override: true
  };
  var getLongPollPlugin = (options) => ({
    applyToStack: (clientStack) => {
      clientStack.add(longPollMiddleware(), longPollMiddlewareOptions);
    }
  });
  function setCredentialFeature(credentials, feature, value) {
    if (!credentials.$source) {
      credentials.$source = {};
    }
    credentials.$source[feature] = value;
    return credentials;
  }
  function setFeature(context, feature, value) {
    if (!context.__aws_sdk_context) {
      context.__aws_sdk_context = {
        features: {}
      };
    } else if (!context.__aws_sdk_context.features) {
      context.__aws_sdk_context.features = {};
    }
    context.__aws_sdk_context.features[feature] = value;
  }
  function setTokenFeature(token, feature, value) {
    if (!token.$source) {
      token.$source = {};
    }
    token.$source[feature] = value;
    return token;
  }
  exports.emitWarningIfUnsupportedVersion = emitWarningIfUnsupportedVersion;
  exports.getLongPollPlugin = getLongPollPlugin;
  exports.setCredentialFeature = setCredentialFeature;
  exports.setFeature = setFeature;
  exports.setTokenFeature = setTokenFeature;
  exports.state = state;
});

export { require_client };
