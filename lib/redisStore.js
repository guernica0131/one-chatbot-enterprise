const config = require("config");
const One = require("./one");
const _ = require("lodash");

const REDIS_URL = process.env.REDIS_URL
  ? process.env.REDIS_URL
  : config.get("redisUrl");

const REDIS_PREFIX = process.env.REDIS_PREFIX
  ? process.env.REDIS_URL
  : config.get("redisPrefix");

const redis = require("redis"),
  client = redis.createClient({
    host: REDIS_URL,
    prefix: REDIS_PREFIX
  });

const { promisify } = require("util");
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);

const getKey = event => {
  const senderID = event.sender.id;
  const recipientID = event.recipient.id;
  const key = `${senderID}/${recipientID}`;
  return key;
};

const getLanguage = (session, question) => {
  const languageButtons = [];
  _.each(session.laguage_labels, (l, k) => {
    const _var = session.variables.system_translations[l];
    const name = (_var || {})[k] || (_var || {}).en;
    if (name) {
      const button = {
        type: "postback",
        title: (_var || {}).en,
        payload: k
      };
      languageButtons.push(button);
    }
  });
  question.attachment.payload.buttons = languageButtons;
  return question;
};

const getSurvey = (session, question) => {
  const language = session.language_selected || "en";
  const surveyButtons = [];
  _.each(session.surveys, (s, key) => {
    const _var = session.variables.system_translations[s.title];
    const name = (_var || {})[language] || (_var || {}).en || s.title;
    if (name) {
      const button = {
        type: "postback",
        title: name,
        payload: key
      };
      surveyButtons.push(button);
    }
  });
  question.attachment.payload.buttons = surveyButtons;
  return question;
};
const PRE_QUESTIONS = 2;
const schemaDeltaQuestion = session => {
  const index = session.questionIndex;
  const schema = session.surveys[session.selected_survey].schema || [];
  const schemaSize = _.size(schema);
  const delta = index - PRE_QUESTIONS;
  console.log("I AM THE PREQUESITON", delta, index);
  const question = schema[delta];
  return question;
};
const schemaSize = session => {
  const selected_survey = session.selected_survey;
  let survey = {};
  if (selected_survey) {
    survey = session.surveys[selected_survey];
  }
  return PRE_QUESTIONS + (_.size(survey.schema) - 1) || -1;
};

const getQuestionMap = type => {
  const map = {
    button: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button"
          // text:
          //   ((variables.chatbot_variables || {}).introduction_message || {})
          //     .en || "Please select your languge:"
        }
      }
    },
    quick: {}
  };

  return {
    ...map[type]
  };
};

const textTemplate = text => {
  return {
    ...{}
  };
};

const buildStandarButtons = (question, variables, language) => {
  const buttons = [];
  switch (question.type) {
    case "json":
      _.each(question.select_options, s => {
        const title = s.select_text[language] || s.select_text["en"];
        if (title) {
          const button = {
            // type: "postback",
            content_type: "text",
            title: title,
            payload: s.name
          };
          console.log("THESE ARE MY little BUTTONS", button);
          buttons.push(button);
        }
      });
      break;
    default:
      const vars = variables[question.name];
      _.each(vars, (v, identity) => {
        const title = v[language] || v["en"];
        if (title) {
          const button = {
            // type: "postback",
            content_type: "text",
            title: title,
            payload: v.__id__
          };
          console.log("THESE ARE MY big BUTTONS", button);
          buttons.push(button);
        }
      });
  }

  return buttons;
};

const parseQuestion = (question, session) => {
  const variables = session.variables;
  const index = session.questionIndex;
  const language = session.language_selected || "en";
  const selected_survey = session.selected_survey;
  let survey;
  if (selected_survey) {
    survey = session.surveys[selected_survey];
  }
  /*
   * We try to pull the survey text, then the labeled variable, then raw label
   */
  const surveyText =
    (question.survey_text || {})[language] ||
    (question.survey_text || {})["en"] ||
    ((variables.system_translations || {})[question.label] || {})[language] ||
    ((variables.system_translations || {})[question.label] || {})["en"] ||
    question.label;
  let buttonBase;
  let buttons;
  let response;
  switch (question.type) {
    // case "integer":

    // case "float":

    case "variable":
      if (question.priority_map) {
        // has color
      }
      //buttonBase = getQuestionMap("button");
      buttonBase = getQuestionMap("quick");
      //buttonBase.attachment.payload.text = surveyText;
      buttonBase.text = surveyText;
      buttons = buildStandarButtons(question, variables, language);
      // buttonBase.attachment.payload.buttons = buttons;
      buttonBase.quick_replies = buttons;
      response = buttonBase;
      break;
    case "boolean":
      buttonBase = getQuestionMap("button");
      buttonBase.attachment.payload.text = surveyText;
      buttons = [
        {
          type: "postback",
          title:
            ((variables.chatbot_variables || {}).boolean_yes || {})[language] ||
            ((variables.chatbot_variables || {}).boolean_yes || {})["en"] ||
            "Yes",
          payload: "yes"
        },
        {
          type: "postback",
          title:
            ((variables.chatbot_variables || {}).boolean_no || {})[language] ||
            ((variables.chatbot_variables || {}).boolean_no || {})["en"] ||
            "No",
          payload: "no"
        }
      ];
      buttonBase.attachment.payload.buttons = buttons;
      response = buttonBase;
      break;
    case "json":
      //buttonBase = getQuestionMap("button");
      buttonBase = getQuestionMap("quick");
      //buttonBase.attachment.payload.text = surveyText;
      buttonBase.text = surveyText;
      buttons = buildStandarButtons(question, variables, language);
      // buttonBase.attachment.payload.buttons = buttons;
      buttonBase.quick_replies = buttons;
      response = buttonBase;
      break;
    // we'll assume a text response as a default
    default:
      response = {
        text: surveyText,
        metadata: JSON.stringify({
          index: index,
          name: question.name,
          type: question.type
        })
      };
  }

  console.log("THIS IS THE RESPONSE", response);

  return response;
};

const parseResponse = (question, reply) => {
  switch (question.type) {
    case "integer":
      return parseInt(reply);
    case "float":
      return parseFloat(reply);
    case "variable":
      return parseInt(reply);
    case "boolean":
      return reply === "yes" ? true : false;
    case "json":
      console.log("NO IDEAD", reply);
      // need to iterate on multiple
      if (question.multiple) {
        // return something
      }
      return {
        [reply]: true
      };
    // we'll assume a text response as a default
    default:
      return reply;
  }
};

const questions = session => {
  const variables = session.variables;
  const index = session.questionIndex;
  const selected_survey = session.selected_survey;
  let survey;
  if (selected_survey) {
    survey = session.surveys[selected_survey];
  }

  /*
      {
                type: "web_url",
                url: "https://www.oculus.com/en-us/rift/",
                title: "Open Web URL"
              },
              {
                type: "postback",
                title: "Trigger Postback",
                payload: "DEVELOPER_DEFINED_PAYLOAD"
              },
              {
                type: "phone_number",
                title: "Call Phone Number",
                payload: "+16505551234"
              }
  */
  const questions = () => {
    return {
      ...{
        introduction_message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text:
                ((variables.chatbot_variables || {}).introduction_message || {})
                  .en || "Please select your languge:"
            }
          }
        },
        location_message: {},
        image_upload: {},
        contact_details: {},
        conclusion_message: {},
        survey_select_message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text:
                (
                  (variables.chatbot_variables || {}).survey_select_message ||
                  {}
                ).en || "What's the nature of your emergency?"
            }
          }
        }
      }
    };
  };

  let question;
  switch (index) {
    case 0:
      question = getLanguage(session, questions().introduction_message);
      break;
    case 1:
      question = getSurvey(session, questions().survey_select_message);
    case schemaSize(session): // we are at then end
      break;
    default:
      const q = schemaDeltaQuestion(session);
      question = parseQuestion(q, session);
  }

  console.log("GOT THIS QUESTION", question);
  return question;
};

module.exports = {
  setReply: async (session, reply) => {
    let index = session.questionIndex;
    switch (index) {
      case 0:
        session.language_selected = reply;
        break;
      case 1:
        session.selected_survey = reply;
        session.survey_answers = {
          [reply]: {}
        };
      case schemaSize(session): // we are at then end
        break;
      default:
        const q = schemaDeltaQuestion(session);
        session.survey_answers = {
          [session.selected_survey]: {
            [q.name]: parseResponse(q, reply)
          }
        };
      /*
         FIND THE QUESTION BEING ANSWERED
        */
    }
    index++;
    session.questionIndex = index;
    const key = session.sessionKey;
    const storage = JSON.stringify(session);
    const set = await setAsync(key, storage);

    if (set === "OK") {
      return session;
    }
    throw new Error("CANT CREATE A SESSION");
  },
  nextQuestion: async (event, survey) => {
    // now build the question types based on the
    // params
    return questions(survey);
  },
  getKey: getKey,
  get: async event => {
    const key = getKey(event);
    let session = await getAsync(key);
    if (!session) {
      const sessionDetails = await One.startSession(event);
      // set session and make it expire after 1 hour
      session = await startSession(sessionDetails, key, "EX", 60 * 60);
    }
    const parsed = JSON.parse(session);
    return parsed;
  }
};

async function startSession(sessionDetails, key) {
  const index = 0;
  sessionDetails.sessionKey = key;
  sessionDetails.questionIndex = index;
  const storage = JSON.stringify(sessionDetails);
  const session = await setAsync(key, storage);

  if (session === "OK") {
    return storage;
  }
  throw new Error("CANT CREATE A SESSION");
}
