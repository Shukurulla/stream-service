const quests = [
  {
    section: "Class Information",
    answers: [
      {
        quest: "Number of students present",
        type: "integer",
      },
      {
        quest: "Number of students using phones",
        type: "integer",
      },
      {
        quest: "Number of students sleeping",
        type: "integer",
      },
      {
        quest: "Is there an interactive whiteboard?",
        type: "boolean",
      },
    ],
  },
  {
    section: "Technical Equipment",
    answers: [
      {
        quest: "Was the interactive whiteboard used?",
        type: "boolean",
      },
      {
        quest: "Is there a projector?",
        type: "boolean",
      },
      {
        quest: "Was the projector used?",
        type: "boolean",
      },
      {
        quest: "Is there audio equipment?",
        type: "boolean",
      },
      {
        quest: "Was the audio equipment used",
        type: "boolean",
      },
      {
        quest: "Other equipment",
        type: "string",
      },
    ],
  },
  {
    section: "Lesson Process",
    answers: [
      {
        quest:
          "Did the lesson start on time with a clear introduction to the topic?",
        type: "boolean",
      },
      {
        quest: "How was students’ attention captured?",
        type: "string",
      },
      {
        quest: "Were the lesson objectives clearly stated?",
        type: "boolean",
      },
      {
        quest: "Was student activity observed?",
        type: "string",
      },
      {
        quest: "How did the teacher explain the material?",
        type: "string",
      },
    ],
  },
  {
    section: "Methods Used",
    answers: [
      {
        quest: "Were interactive methods used?",
        type: "boolean",
      },
      {
        quest: "Examples of methods used",
        type: "string",
      },
      {
        quest: "Was a differentiated approach applied?",
        type: "boolean",
      },
      {
        quest: "How was knowledge assessed?",
        type: "string",
      },
    ],
  },
  {
    section: "Interaction with Students",
    answers: [
      {
        quest: "How did the teacher interact with the students?",
        type: "string",
      },
      {
        quest: "Were there any discipline issues?",
        type: "boolean",
      },
      {
        quest: "Was a differentiated approach applied?",
        type: "boolean",
      },
      {
        quest: "How were discipline issues resolved?",
        type: "string",
      },
    ],
  },
  {
    section: "Lesson Outcomes",
    answers: [
      {
        quest: "Were the lesson’s conclusions clearly summarized?",
        type: "boolean",
      },
      {
        quest: "Were students able to formulate conclusions?",
        type: "boolean",
      },
      {
        quest: "Was a differentiated approach applied?",
        type: "boolean",
      },
    ],
  },
  {
    section: "Lesson Outcomes",
    answers: [
      {
        quest: "Strengths of the lesson",
        type: "string",
      },
      {
        quest: "Areas for improvement",
        type: "string",
      },
      {
        quest: "Recommendations for the teacher",
        type: "string",
      },
    ],
  },
  {
    section: "Additional Notes",
    answers: [
      {
        quest: "Additional notes",
        type: "string",
      },
    ],
  },
];

export default quests;
