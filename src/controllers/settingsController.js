import { User }     from '../database/model/users.js';
import { Settings } from '../database/model/settings.js';
import { sendError, sendSucess } from '../../utils/sendError.js';
import { trackActivity } from '../../service/activityService.js';

// ─── GET /api/settings ────────────────────────────────────────────────────────
/**
 * Returns the settings document for the authenticated user's school.
 * If no settings exist yet, returns the model defaults.
 */
export const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('school').lean();

    if (!user?.school) {
      return sendError(res, 'User is not associated with any school', 400);
    }

    const schoolId = user.school._id;

    // findOneAndUpdate with upsert=true gives us defaults on first load
    const settings = await Settings.findOneAndUpdate(
      { school: schoolId },
      { $setOnInsert: { school: schoolId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return sendSucess(res, 'Settings retrieved successfully', settings, 200);
  } catch (error) {
    console.error('[settingsController.getSettings]', error);
    sendError(res, error.message);
  }
};

// ─── PUT /api/settings ────────────────────────────────────────────────────────
/**
 * Saves the full settings object for the authenticated user's school.
 * Uses findOneAndUpdate with upsert — safe for first-time saves.
 * Strips internal fields (_id, school, __v, timestamps) from the payload
 * so the client cannot overwrite them.
 */
export const saveSettings = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('school').lean();

    if (!user?.school) {
      return sendError(res, 'User is not associated with any school', 400);
    }

    const schoolId = user.school._id;

    // Strip protected fields the client should never overwrite
    const {
      _id, school, __v,
      createdAt, updatedAt,
      ...payload
    } = req.body;

    const updated = await Settings.findOneAndUpdate(
      { school: schoolId },
      { $set: { ...payload, school: schoolId } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    trackActivity({
      event:         'TIMETABLE_UPDATED',
      eventCategory: 'TIMETABLE',
      userId:        req.userId,
      schoolId,
      metadata: {
        entityName: 'Institution Settings',
        action:     'settings_saved',
      },
    });

    return sendSucess(res, 'Settings saved successfully', updated, 200);
  } catch (error) {
    console.error('[settingsController.saveSettings]', error);
    sendError(res, error.message);
  }
};

// ─── PATCH /api/settings ─────────────────────────────────────────────────────
/**
 * Updates a single settings field.
 * Body: { key: string, value: any }
 * Useful for toggle switches that should save immediately.
 */
export const patchSetting = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('school').lean();

    if (!user?.school) {
      return sendError(res, 'User is not associated with any school', 400);
    }

    const schoolId = user.school._id;
    const { key, value } = req.body;

    // Block protected fields
    const PROTECTED = ['_id', 'school', '__v', 'createdAt', 'updatedAt'];
    if (!key || PROTECTED.includes(key)) {
      return sendError(res, `Field "${key}" cannot be updated`, 400);
    }

    const updated = await Settings.findOneAndUpdate(
      { school: schoolId },
      { $set: { [key]: value, school: schoolId } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    return sendSucess(res, `Setting "${key}" updated`, updated, 200);
  } catch (error) {
    console.error('[settingsController.patchSetting]', error);
    sendError(res, error.message);
  }
};