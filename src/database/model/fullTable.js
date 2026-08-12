import mongoose, {Schema} from "mongoose";

const timetableSchema = new Schema(
  {
    name: {
      type: String,
    },
    school: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    config: {
      periodsPerDay: {
        type: Number,
        default: 8,
      },
      periodDuration: {
        type: Number,
        default: 45,
      },
      startTime: {
        type: String,
        default: "08:00",
      },
      breaks: [
        {
          name: String,
          isBreak: Boolean,
          afterPeriod: Number,
          duration: Number,
          _id: false,
        },
      ],
      doublePeriods: [
        {
          day: String,
          period: Number,
        },
      ],
      // NEW: Class Teacher/Parade configuration
      classTeacherPeriods: [
        {
          day: {
            type: String,
            enum: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ],
          },
          period: Number,
          name: {
            type: String,
            default: "Class Teacher/Parade",
          },
          teacher: {
            type: Schema.Types.ObjectId,
            ref: "ListOfTechers",
          },
          _id: false,
        },
      ],
      // NEW: Subject frequency limits per day
      subjectDailyLimits: {
        maxAppearancesPerDay: {
          type: Number,
          default: 2,
        },
        preventConsecutive: {
          type: Boolean,
          default: true,
        },
      },
    },
    timetables: [
      {
        name: String,
        school: {
          type: Schema.Types.ObjectId,
          ref: "School",
        },
        schedule: [
          {
            day: String,
            periods: [
              {
                day: String,
                periodNumber: {
                  type: Number,
                  required: false,
                },
                startTime: {
                  type: String,
                  required: true,
                },
                endTime: {
                  type: String,
                  required: true,
                },
                name: {type: String},
                isBreak: {type: Boolean},
                subject: {
                  _id: {
                    type: Schema.Types.ObjectId,
                    ref: "Subject",
                  },
                  name: String,
                },
                teacher: {
                  _id: {
                    type: Schema.Types.ObjectId,
                    ref: "ListOfTechers",
                  },
                  name: String,
                },
                classroom: {
                  _id: {
                    type: Schema.Types.ObjectId,
                    ref: "ClassData",
                  },
                  name: String,
                },
                warning: String,
                _id: false,
              },
            ],
            _id: false,
          },
        ],
        config: {
          periodsPerDay: Number,
          periodDuration: Number,
          startTime: String,
          breaks: [
            {
              name: String,
              afterPeriod: Number,
              duration: Number,
              _id: false,
            },
          ],
          doublePeriods: [
            {
              day: String,
              period: Number,
            },
          ],
          // NEW: Class Teacher/Parade config per timetable
          classTeacherPeriods: [
            {
              day: {
                type: String,
                enum: [
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ],
              },
              period: Number,
              name: {
                type: String,
                default: "Class Teacher/Parade",
              },
              teacher: {
                type: Schema.Types.ObjectId,
                ref: "ListOfTechers",
              },
              _id: false,
            },
          ],
          // NEW: Subject daily limits per timetable
          subjectDailyLimits: {
            maxAppearancesPerDay: {
              type: Number,
              default: 2,
            },
            preventConsecutive: {
              type: Boolean,
              default: true,
            },
          },
        },
        constraints: {},
        _id: false,
      },
    ],
    constraints: {
      // EXISTING: Subject weekly frequency
      subjectWeeklyFrequency: [
        {
          subject: {
            type: Schema.Types.ObjectId,
            ref: "Subject",
          },
          requiredPeriods: Number,
          _id: false,
        },
      ],

      // NEW: Subject specialization constraints
      subjectSpecializations: {
        // Subjects that require specialized rooms
        labSubjects: [
          {
            subject: {
              type: Schema.Types.ObjectId,
              ref: "Subject",
            },
            requiredRoom: {
              type: String,
              enum: [
                "Chemistry Lab",
                "Biology Lab",
                "Physics Lab",
                "Computer Lab",
                "Home Science Lab",
                "Agriculture Lab",
              ],
            },
            preferredDoublePeriod: {
              type: Boolean,
              default: true,
            },
            // Minimum students required to run the lab
            minStudentsRequired: {
              type: Number,
              default: 10,
            },
            _id: false,
          },
        ],
        // PE/Games configuration
        peGames: {
          requiredPerWeek: {
            type: Number,
            default: 2,
          },
          preferredSlots: {
            // Usually PE is best in morning or after break, not last period
            morningSlots: {
              type: Boolean,
              default: true,
            },
            afternoonSlots: {
              type: Boolean,
              default: false,
            },
            avoidLastPeriod: {
              type: Boolean,
              default: true,
            },
          },
          // PE can be combined classes
          allowCombinedClasses: {
            type: Boolean,
            default: true,
          },
        },
      },

      // NEW: Prep/Study periods
      prepPeriods: [
        {
          day: {
            type: String,
            enum: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ],
          },
          period: Number,
          duration: {
            type: Number,
            default: 45, // in minutes
          },
          name: {
            type: String,
            default: "Prep/Study",
          },
          supervisor: {
            type: Schema.Types.ObjectId,
            ref: "ListOfTechers",
          },
          // Whether prep is supervised or free
          isSupervised: {
            type: Boolean,
            default: true,
          },
          // Prep can be specific subjects
          subject: {
            type: Schema.Types.ObjectId,
            ref: "Subject",
          },
          _id: false,
        },
      ],

      // NEW: Room/Classroom capacity constraints
      roomConstraints: {
        enableRoomCollisionCheck: {
          type: Boolean,
          default: true,
        },
        roomCapacityMapping: [
          {
            room: {
              type: Schema.Types.ObjectId,
              ref: "ClassData",
            },
            capacity: Number,
            roomType: {
              type: String,
              enum: [
                "Regular",
                "Chemistry Lab",
                "Biology Lab",
                "Physics Lab",
                "Computer Lab",
                "Home Science Lab",
                "Library",
                "Sports Field",
                "Agriculture Field",
              ],
            },
            // Specialized equipment availability
            hasProjector: Boolean,
            hasSmartBoard: Boolean,
            hasInternet: Boolean,
            _id: false,
          },
        ],
        // Allow sharing of specialized rooms
        allowRoomSharing: {
          type: Boolean,
          default: false,
        },
      },

      // NEW: Time-based constraints
      timeConstraints: {
        // Avoid scheduling practical subjects at the end of the day
        noPracticalSubjectLastPeriod: {
          type: Boolean,
          default: true,
        },
        // Preferred double period slots (morning preferred)
        preferredDoublePeriodSlots: {
          morning: {
            enabled: {
              type: Boolean,
              default: true,
            },
            periods: {
              type: [Number],
              default: [1, 2, 3], // e.g., periods 1-2, 2-3
            },
          },
          afternoon: {
            enabled: {
              type: Boolean,
              default: false,
            },
            periods: {
              type: [Number],
              default: [4, 5],
            },
          },
        },
        // Cognitive variety - spread subjects across the day
        enforceSubjectVariety: {
          type: Boolean,
          default: true,
        },
        // Ensure no two similar subjects in a row
        preventSimilarSubjectsConsecutive: {
          type: Boolean,
          default: true,
        },
        // Morning slots reserved for core subjects
        morningSlotsPreference: {
          coreSubjects: {
            type: Boolean,
            default: true,
          },
          practicalSubjects: {
            type: Boolean,
            default: false,
          },
        },
      },

      // NEW: Extra-curricular activities
      extraCurricularActivities: [
        {
          name: String,
          day: {
            type: String,
            enum: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ],
          },
          time: String,
          duration: Number,
          supervisor: {
            type: Schema.Types.ObjectId,
            ref: "ListOfTechers",
          },
          participants: [
            {
              type: Schema.Types.ObjectId,
              ref: "ClassData",
            },
          ],
          location: String,
          _id: false,
        },
      ],

      // NEW: Parent-teacher meeting slots
      parentTeacherMeetingSlots: [
        {
          day: {
            type: String,
            enum: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ],
          },
          startTime: String,
          endTime: String,
          teacher: {
            type: Schema.Types.ObjectId,
            ref: "ListOfTechers",
          },
          _id: false,
        },
      ],
    },
  },
  {
    timestamps: true,
  },
);

// Add indexes for faster queries
timetableSchema.index({school: 1, name: 1}, {unique: true});
timetableSchema.index({
  "constraints.teacherLoadConstraints.maxPeriodsPerWeek": 1,
});
timetableSchema.index({
  "constraints.subjectSpecializations.labSubjects.subject": 1,
});
timetableSchema.index({
  "constraints.formLevelConstraints.juniorSecondary.coreSubjects.subject": 1,
});
timetableSchema.index({
  "constraints.formLevelConstraints.seniorSecondary.coreSubjects.subject": 1,
});
timetableSchema.index({"constraints.subjectSpecificConstraints.subject": 1});
timetableSchema.index({
  "constraints.knecConstraints.knecMinimumPeriods.subject": 1,
});
timetableSchema.index({"config.classTeacherPeriods.day": 1});
timetableSchema.index({"constraints.prepPeriods.day": 1});

// Add compound index for school and constraints
timetableSchema.index({
  school: 1,
  "constraints.qualityMetrics.overallScore": 1,
});

export const GenTable = mongoose.model("Timetable", timetableSchema);
