const config = require("config");
const request = require("request");
const saveMethodTypes = ["PUT", "POST"];
let answers = {};

const ONE_HOST = process.env.ONE_HOST
  ? process.env.ONE_HOST
  : config.get("oneHost");

const AUTH_TOKEN = process.env.AUTH_TOKEN
  ? process.env.AUTH_TOKEN
  : config.get("authToken");

const SECRET_TOKEN = process.env.SECRET_TOKEN
  ? process.env.SECRET_TOKEN
  : config.get("secretToken");

const SYNC_URL = process.env.SYNC_URL
  ? process.env.SYNC_URL
  : config.get("syncUrl");

const DELIVERY_URL = process.env.DELIVERY_URL
  ? process.env.DELIVERY_URL
  : config.get("deliveryUrl");

function get(url, authenticationParam, secretParam) {
  return new Promise(function(resolve, reject) {
    let options = {
      // method: 'GET',
      url: url,
      headers: {
        "Content-Type": "application/json",
        authentication: authenticationParam,
        secret: secretParam
      }
    };

    request(options, function(error, response, body) {
      if (error) {
        reject({ statusCode: error.code, error: error.code });
      } else if (response.statusCode !== 200) {
        reject({ statusCode: response.statusCode, error: error });
      } else {
        resolve(response);
      }
    });
  });
}

function save(method, surveyData, url, authenticationParam, secretParam) {
  return new Promise(function(resolve, reject) {
    if (!saveMethodTypes.includes(method)) {
      reject(`${method} is not a supported method`);
    }

    let options = {
      method: method,
      url: url,
      headers: {
        "Content-Type": "application/json",
        authentication: AUTH_TOKEN,
        secret: SECRET_TOKEN
      },
      body: JSON.stringify(surveyData)
    };

    request(options, function(error, response, body) {
      if (error) {
        reject({ statusCode: error.code, error: error.code });
      } else if (response.statusCode !== 200) {
        reject({ statusCode: response.statusCode, error: error });
      } else {
        resolve(response);
      }
    });
  });
}

function getJson() {
  return answers;
}

function addToJson(questionId, answer) {
  answers[questionId] = answer;
}

function clearJson() {
  answers = {};
}

function startSession() {
  return new Promise((resolve, reject) => {
    const options = {
      method: "get",
      url: `${ONE_HOST}${SYNC_URL}`,
      headers: {
        "Content-Type": "application/json",
        authentication: AUTH_TOKEN,
        secret: SECRET_TOKEN
      }
    };
    request(options, function(error, response, body) {
      if (error) {
        reject({ statusCode: error.code, error: error.code });
      } else if (response.statusCode !== 200) {
        reject({ statusCode: response.statusCode, error: error });
      } else {
        const res = JSON.parse(response.body);
        resolve(res);
      }
    });
  });
}

module.exports = {
  save,
  get,
  getJson,
  addToJson,
  clearJson,
  startSession
};
