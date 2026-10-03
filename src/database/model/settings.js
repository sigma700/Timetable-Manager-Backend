import mongoose, { Schema } from 'mongoose';

const settingsSchema = new Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      unique: true, // one settings doc per school
    },

    // ── Institution ──────────────────────────────────────────────────────────
    name:       { type: String, default: '' },
    schoolType: { type: String, enum: ['primary','secondary','college','university','vocational'], default: 'secondary' },
    curriculum: { type: String, enum: ['8-4-4','cbc','igcse'], default: '8-4-4' },
    location:   { type: String, default: '' },
    website:    { type: String, default: '' },

    // ── Academic Calendar ─────────────────────────────────────────────────────
    academicYear:  { type: String, default: '2025/2026' },
    currentTerm:   { type: String, default: 'term1' },
    numTerms:      { type: String, default: '3' },
    startDate:     { type: String, default: '' },
    endDate:       { type: String, default: '' },

    // ── Schedule Timing ───────────────────────────────────────────────────────
    startTime:      { type: String, default: '07:00' },
    endTime:        { type: String, default: '17:00' },
    lessonsPerDay:  { type: Number, default: 8 },
    lessonDuration: { type: Number, default: 40 },
    breakDuration:  { type: Number, default: 15 },
    lunchDuration:  { type: Number, default: 45 },
    saturdayClasses:{ type: Boolean, default: false },
    sundayClasses:  { type: Boolean, default: false },

    // ── Generation Defaults ───────────────────────────────────────────────────
    strategy:           { type: String, default: 'balanced' },
    optimizationMode:   { type: String, default: 'balanced' },
    autoRegenerate:     { type: Boolean, default: false },
    conflictResolution: { type: String, default: 'skip' },

    // ── Teacher Rules ─────────────────────────────────────────────────────────
    maxTeacherDaily:       { type: Number, default: 6 },
    maxTeacherWeekly:      { type: Number, default: 30 },
    minTeacherBreak:       { type: String, default: 'none' },
    avoidConsecutiveDouble:{ type: Boolean, default: true },

    // ── Subject Rules ─────────────────────────────────────────────────────────
    doubleAllowed:    { type: Boolean, default: true },
    maxDoubles:       { type: Number, default: 2 },
    labPriority:      { type: Boolean, default: true },
    kiswahiliMinimum: { type: Boolean, default: true },
    morningBias:      { type: Boolean, default: true },

    // ── AI Engine ─────────────────────────────────────────────────────────────
    aiAutoResolve:       { type: Boolean, default: true },
    generationQuality:   { type: String, default: 'balanced' },
    confidenceThreshold: { type: Number, default: 80 },
    smartSuggestions:    { type: Boolean, default: true },
    predictiveMode:      { type: Boolean, default: false },
    learningMode:        { type: Boolean, default: false },
    allowRearrangement:  { type: Boolean, default: true },

    // ── Regeneration ──────────────────────────────────────────────────────────
    regenStrategy:  { type: String, default: 'partial' },
    versionHistory: { type: Boolean, default: true },
    rollbackSupport:{ type: Boolean, default: true },

    // ── Notifications ─────────────────────────────────────────────────────────
    emailNotifs:     { type: Boolean, default: true },
    conflictAlerts:  { type: Boolean, default: true },
    generationNotif: { type: Boolean, default: true },
    weeklySummary:   { type: Boolean, default: false },

    // ── Appearance ────────────────────────────────────────────────────────────
    theme:       { type: String, default: 'dark' },
    compactMode: { type: Boolean, default: false },

    // ── Security ──────────────────────────────────────────────────────────────
    twoFactor:      { type: Boolean, default: false },
    sessionTimeout: { type: String, default: '24h' },
    loginNotifs:    { type: Boolean, default: true },

    // ── Data & Backup ─────────────────────────────────────────────────────────
    autoBackup:    { type: Boolean, default: true },
    dataRetention: { type: String, default: '1year' },
    exportFormat:  { type: String, default: 'pdf' },
  },
  { timestamps: true }
);

export const Settings = mongoose.model('Settings', settingsSchema);