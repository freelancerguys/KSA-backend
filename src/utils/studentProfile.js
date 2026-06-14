export const GENDER_VALUES = ['Male', 'Female', 'Other', ''];
export const BLOOD_GROUP_VALUES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''];

const GENDER_MAP = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  Male: 'Male',
  Female: 'Female',
  Other: 'Other',
};

export const normalizeGender = (value) => {
  if (value === undefined || value === null) return undefined;
  const v = String(value).trim();
  if (!v) return '';
  return GENDER_MAP[v] || GENDER_MAP[v.toLowerCase()] || '';
};

export const normalizeBloodGroup = (value) => {
  if (value === undefined || value === null) return undefined;
  const v = String(value).trim().toUpperCase().replace(/\s/g, '');
  if (!v) return '';
  return BLOOD_GROUP_VALUES.includes(v) ? v : '';
};

export const applyProfileFields = (target, body, fields) => {
  fields.forEach((key) => {
    if (body[key] === undefined) return;
    if (key === 'gender') {
      target.gender = normalizeGender(body.gender);
      return;
    }
    if (key === 'bloodGroup') {
      target.bloodGroup = normalizeBloodGroup(body.bloodGroup);
      return;
    }
    if (key === 'parentGuardianName' || key === 'motherName' || key === 'fatherName') {
      target[key] = String(body[key] || '').trim();
      return;
    }
    target[key] = body[key];
  });
};
